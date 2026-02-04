---
description: Tumiki Dynamic Search機能の実装・拡張・デバッグのための包括的なガイドライン。MCPサーバーのツール検索・実行機能の理解と開発に使用。
---

# Dynamic Search 機能 - 開発リファレンス

> **注意**: Dynamic SearchはEnterprise Edition（EE）機能です。CE版では無効化されます。
> 全てのEE実装ファイルには `.ee.ts` 拡張子と SPDXライセンスヘッダーが必要です。

**このスキルを使用する場面：**

- Dynamic Search機能の新規実装・拡張時
- メタツール（search_tools, describe_tools, execute_tool）の追加時
- AI検索機能のカスタマイズ・精度改善時
- Dynamic Search関連のバグ修正・デバッグ時
- MCPサーバーへのDynamic Search有効化設定時
- EE/CE分離アーキテクチャの理解が必要な時

## アーキテクチャ概要

Dynamic Searchは、MCPサーバーのツール発見を最適化するためのインテリジェント検索システム。

**従来モード（dynamicSearch=false）**

- 全ツールを`{template}__{toolName}`形式で公開
- AIのコンテキストが肥大化

**Dynamic Searchモード（dynamicSearch=true）**

- 3つのメタツールのみ公開
- 必要なツールを動的に検索・取得

### 使用フロー

1. **search_tools** - 自然言語でツールを検索
2. **describe_tools** - 見つかったツールのスキーマを取得
3. **execute_tool** - ツールを実行

## コンポーネント構成

```
apps/mcp-proxy/src/services/dynamicSearch/
├── index.ts                    # CE Facade（スタブ）
├── index.ee.ts                 # EEエントリーポイント
├── types.ee.ts                 # 型定義（EE）
├── metaToolDefinitions.ee.ts   # メタツール定義（EE）
├── searchTools.ee.ts           # AI検索実装（EE）
├── describeTools.ee.ts         # スキーマ取得（EE）
├── executeToolDynamic.ee.ts    # 実行ラッパー（EE）
└── __tests__/                  # テスト
    ├── *.ee.test.ts            # EE機能テスト
```

## 型定義

### MCP SDK型（re-export）

```typescript
// types.ee.ts
import type {
  Tool,
  CallToolRequestParams,
} from "@modelcontextprotocol/sdk/types.js";
```

### Dynamic Search固有の型

```typescript
// search_tools の引数
type SearchToolsArgs = {
  query: string; // 検索クエリ（自然言語）
  limit?: number; // 最大結果数（デフォルト: 10）
};

// describe_tools の引数
type DescribeToolsArgs = {
  toolNames: string[]; // スキーマを取得するツール名
};

// 検索結果
type SearchResult = {
  toolName: string;
  description: string | undefined;
  relevanceScore: number; // 0-1
};

// describe_tools の結果
type DescribeToolsResult = {
  toolName: string;
  description: string | undefined;
  inputSchema: Tool["inputSchema"] | Record<string, never>;
  found: boolean;
};
```

## メタツール定義

### search_tools

```typescript
export const SEARCH_TOOLS_DEFINITION: Tool = {
  name: "search_tools",
  description:
    "利用可能なツールをクエリで検索します。自然言語でツールの機能を説明すると、関連するツールを返します。",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "検索クエリ（例: 'ファイルを作成する', 'GitHubのissueを取得'）",
      },
      limit: {
        type: "number",
        description: "返す結果の最大数（デフォルト: 10）",
        default: 10,
      },
    },
    required: ["query"],
  },
};
```

### describe_tools

```typescript
export const DESCRIBE_TOOLS_DEFINITION: Tool = {
  name: "describe_tools",
  description:
    "指定されたツールの詳細な入力スキーマを取得します。search_toolsで見つけたツールの詳細を確認するために使用します。",
  inputSchema: {
    type: "object",
    properties: {
      toolNames: {
        type: "array",
        items: {
          type: "string",
        },
        description: "スキーマを取得するツール名の配列",
      },
    },
    required: ["toolNames"],
  },
};
```

### execute_tool

```typescript
export const EXECUTE_TOOL_DEFINITION: Tool = {
  name: "execute_tool",
  description:
    "指定されたツールを実行します。事前にdescribe_toolsでスキーマを確認し、適切な引数を渡してください。",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "実行するツール名",
      },
      arguments: {
        type: "object",
        description: "ツールに渡す引数",
        additionalProperties: true,
      },
    },
    required: ["name"],
  },
};
```

### ユーティリティ

```typescript
// 全メタツール定義の配列
export const DYNAMIC_SEARCH_META_TOOLS: Tool[] = [
  SEARCH_TOOLS_DEFINITION,
  DESCRIBE_TOOLS_DEFINITION,
  EXECUTE_TOOL_DEFINITION,
];

// メタツール名のセット（高速検索用）
export const META_TOOL_NAMES = new Set(
  DYNAMIC_SEARCH_META_TOOLS.map((tool) => tool.name),
);

// 指定された名前がメタツールかどうかを判定
export const isMetaTool = (toolName: string): boolean => {
  return META_TOOL_NAMES.has(toolName);
};
```

## AI検索実装

### searchTools関数

```typescript
// searchTools.ee.ts
import { generateObject } from "ai";
import { z } from "zod";

import { gateway, DYNAMIC_SEARCH_MODEL } from "../../libs/ai/index.js";
import { logError, logInfo } from "../../libs/logger/index.js";
import type { SearchToolsArgs, SearchResult, Tool } from "./types.ee.js";

const searchResultSchema = z.object({
  results: z.array(
    z.object({
      toolName: z.string().describe("ツール名"),
      relevanceScore: z.number().min(0).max(1).describe("関連度スコア（0-1）"),
    }),
  ),
});

export const searchTools = async (
  args: SearchToolsArgs,
  internalTools: Tool[],
): Promise<SearchResult[]> => {
  const { query, limit = 10 } = args;

  // ツールが0件の場合は空配列を返す
  if (internalTools.length === 0) {
    return [];
  }

  // ツールリストの説明を生成
  const toolDescriptions = internalTools
    .map((tool) => `- ${tool.name}: ${tool.description ?? "説明なし"}`)
    .join("\n");

  const { object } = await generateObject({
    model: gateway(DYNAMIC_SEARCH_MODEL),
    schema: searchResultSchema,
    prompt: `以下のツールリストから、ユーザーのクエリに関連するツールを選んでください。

クエリ: "${query}"

利用可能なツール:
${toolDescriptions}

指示:
- クエリに最も関連するツールを最大${limit}件選んでください
- 各ツールに対して、クエリとの関連度スコア（0-1）を付けてください
- 関連度スコアが高い順に並べてください
- 全く関連がないツールは含めないでください
- ツール名は完全に一致させてください（変更しないでください）`,
  });

  return object.results.map((result) => {
    const tool = internalTools.find((t) => t.name === result.toolName);
    return {
      toolName: result.toolName,
      description: tool?.description,
      relevanceScore: result.relevanceScore,
    };
  });
};
```

### AIモデル設定

```typescript
// libs/ai/provider.ts
export const DYNAMIC_SEARCH_MODEL = "anthropic/claude-3.5-haiku";
```

## 新しいメタツール追加手順

### 1. 型定義追加（types.ee.ts）

```typescript
// SPDX-License-Identifier: LicenseRef-Tumiki-EE
// Copyright (c) 2024-2025 Reyven Inc.

export type NewToolArgs = {
  // 引数の定義
};
```

### 2. ツール定義追加（metaToolDefinitions.ee.ts）

```typescript
export const NEW_TOOL_DEFINITION: Tool = {
  name: "new_tool",
  description: "ツールの説明",
  inputSchema: {
    /* スキーマ */
  },
};

// DYNAMIC_SEARCH_META_TOOLS配列に追加
export const DYNAMIC_SEARCH_META_TOOLS: Tool[] = [
  SEARCH_TOOLS_DEFINITION,
  DESCRIBE_TOOLS_DEFINITION,
  EXECUTE_TOOL_DEFINITION,
  NEW_TOOL_DEFINITION, // 追加
];
```

### 3. 実装ファイル作成（newTool.ee.ts）

```typescript
// SPDX-License-Identifier: LicenseRef-Tumiki-EE
// Copyright (c) 2024-2025 Reyven Inc.

export const newTool = async (
  args: NewToolArgs,
  internalTools: Tool[],
): Promise<SomeResult> => {
  // 実装
};
```

### 4. index.ee.tsにエクスポート追加

```typescript
export { newTool } from "./newTool.ee.js";
```

### 5. mcpHandler.tsに処理追加

```typescript
case "new_tool":
  const result = await newTool(args as NewToolArgs, internalTools);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
```

---

## EE/CE分離アーキテクチャ

Dynamic SearchはEnterprise Edition（EE）機能であり、CE版では無効化されます。

### ファイル構成

| ファイル       | 役割                      |
| -------------- | ------------------------- |
| `index.ts`     | CE Facade（スタブを返す） |
| `index.ee.ts`  | EE実装エントリーポイント  |
| `*.ee.ts`      | EE機能の実装              |
| `*.ee.test.ts` | EE機能のテスト            |

### CE版Facade（index.ts）

```typescript
// CE版: 型のみエクスポート、機能は無効化
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// CE版ではDynamic Searchは利用不可
export const DYNAMIC_SEARCH_AVAILABLE = false;

// CE版ではメタツールは空配列
export const DYNAMIC_SEARCH_META_TOOLS: Tool[] = [];

// CE版では常に false を返す
export const isMetaTool = (_name: string): boolean => false;

// CE版でも型互換性のため型定義をエクスポート
export type SearchResult = {
  toolName: string;
  description: string | undefined;
  relevanceScore: number;
};

export type DescribeToolsResult = {
  toolName: string;
  description: string | undefined;
  inputSchema: Tool["inputSchema"] | Record<string, never>;
  found: boolean;
};
```

### SPDXライセンスヘッダー

全てのEEファイルに必須：

```typescript
// SPDX-License-Identifier: LicenseRef-Tumiki-EE
// Copyright (c) 2024-2025 Reyven Inc.
```

---

## 実装チェックリスト

### 新機能追加時

- [ ] `types.ee.ts`に型定義を追加
- [ ] `metaToolDefinitions.ee.ts`にツール定義を追加
- [ ] 実装ファイル（`*.ee.ts`）を作成
- [ ] SPDXライセンスヘッダーを追加
- [ ] `index.ee.ts`にエクスポートを追加
- [ ] `mcpHandler.ts`に処理を追加
- [ ] 単体テスト（`*.ee.test.ts`）を作成（100%カバレッジ）
- [ ] `pnpm typecheck`で型エラーなし
- [ ] `EE_BUILD=true pnpm test`でテスト成功

### Dynamic Search有効化設定時

- [ ] `McpServer.dynamicSearch`をtrueに設定
- [ ] `tools/list`がメタツール3つのみ返すことを確認
- [ ] `search_tools`で内部ツールが検索できることを確認
- [ ] `describe_tools`でスキーマ取得できることを確認
- [ ] `execute_tool`でツール実行できることを確認

### デバッグ時

- [ ] ログ出力確認（`logInfo`, `logError`, `logWarn`）
- [ ] AI SDK（`generateObject`）のエラー確認
- [ ] MCP接続エラー確認
- [ ] 型の整合性確認

---

## トラブルシューティング

### AI検索が結果を返さない

1. `internalTools`が空でないか確認
2. `DYNAMIC_SEARCH_MODEL`が正しいか確認
3. AI SDKのエラーログを確認
4. プロンプトの指示が明確か確認

### ツール実行が失敗する

1. ツール名が正確か確認（`{template}__{toolName}`形式）
2. 引数がスキーマに合致しているか確認
3. MCPサーバーへの接続を確認
4. 権限設定を確認

### 型エラーが発生する

1. MCP SDK型を使用しているか確認
2. `types.ee.ts`の定義と実装が一致しているか確認
3. re-exportが正しいか確認

### describe_toolsでツールが見つからない

1. `toolNames`配列のツール名が正確か確認
2. `found: false`が返された場合、ツール名のスペルを確認
3. ログで`Tool not found in describe_tools`を確認

## 活用のポイント

このスキルを活用することで：

- **効率的なツール発見**: 大量のツールから必要なものを素早く発見
- **コンテキスト最適化**: AIのコンテキストウィンドウを節約
- **拡張性**: 新しいメタツールを追加して機能拡張
- **デバッグ効率化**: チェックリストとトラブルシューティングで問題を素早く解決
