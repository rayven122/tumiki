# @tumiki/utils

共有ユーティリティ関数とヘルパー関数のパッケージです。サーバーサイド専用、クライアントサイド専用、両環境対応の機能を適切に分離して提供します。

## 📁 ディレクトリ構造

```text
packages/utils/src/
├── server/               # サーバーサイド専用
│   ├── index.ts         # サーバー側のエントリーポイント
│   └── getMcpServerTools.ts  # MCP SDK (Node.js専用)
├── client/               # クライアントサイド専用
│   └── index.ts         # クライアント側のエントリーポイント
├── faviconUtils.ts      # ファビコン関連ユーティリティ（両環境対応）
├── converter.ts         # データ変換ユーティリティ（両環境対応）
└── index.ts            # メインエントリーポイント
```

## 📦 インストール

```bash
pnpm add @tumiki/utils
```

## 🚀 使用方法

### 両環境対応の関数

```typescript
// ファビコン関連
// データ変換
import {
  convertToSortOrder,
  extractDomainFromUrl,
  getFaviconUrls,
  getFaviconUrlsFromUrl,
} from "@tumiki/utils";
```

### サーバーサイド専用の関数

```typescript
// MCP (Model Context Protocol) サーバー関連
import { getMcpServerTools, getMcpServerToolsSSE } from "@tumiki/utils/server";
```

### クライアントサイド専用の関数

```typescript
// 現在はクライアント専用の関数はありません
import "@tumiki/utils/client";
```

## 🔧 API リファレンス

### ファビコンユーティリティ

#### `getFaviconUrlsFromUrl(url: string, size?: number): string[]`

URLからファビコンURLのリストを取得します。

```typescript
const faviconUrls = getFaviconUrlsFromUrl("https://example.com", 32);
// ['https://www.google.com/s2/favicons?domain=example.com&sz=32', ...]
```

#### `getFaviconUrls(domain: string, size?: number): string[]`

ドメイン名から複数のファビコンURLを生成します。

```typescript
const faviconUrls = getFaviconUrls("example.com", 32);
```

#### `extractDomainFromUrl(url: string): string | null`

URLからドメイン名を抽出します。

```typescript
const domain = extractDomainFromUrl("https://api.example.com/path");
// "example.com"
```

### データ変換ユーティリティ

#### `convertToSortOrder<T>(crossTableList: T[]): T[]`

交差テーブルのsortOrderを利用してソートを行います。

```typescript
const sorted = convertToSortOrder([
  { id: 1, sortOrder: 2 },
  { id: 2, sortOrder: 1 },
]);
```

### サーバーサイド専用機能

#### `getMcpServerTools(server: McpServer, envVars: Record<string, string>): Promise<Tool[]>`

MCPサーバーからツール一覧を取得します。

```typescript
import { getMcpServerTools } from "@tumiki/utils/server";

const tools = await getMcpServerTools(mcpServer, {
  API_KEY: "your-api-key",
});
```

#### `getMcpServerToolsSSE(server: Pick<McpServer, "name" | "url">, envVars: Record<string, string>): Promise<Tool[]>`

SSE版のMCPサーバーからツール一覧を取得します（10秒タイムアウト付き）。

```typescript
import { getMcpServerToolsSSE } from "@tumiki/utils/server";

const tools = await getMcpServerToolsSSE(
  { name: "example", url: "https://example.com" },
  { API_KEY: "your-api-key" },
);
```

## 🛡️ セキュリティ

- **サーバーサイド専用関数**: Node.js固有のモジュール（fs、child_process等）を使用するため、ブラウザ環境では実行されません
- **環境判定**: `typeof window !== "undefined"` でクライアントサイド実行を防止
- **型安全性**: TypeScriptによる厳密な型チェック

## 🔄 開発ワークフロー

### ビルド

```bash
pnpm build
```

### 型チェック

```bash
pnpm typecheck
```

### テスト

```bash
pnpm test
```

### リント

```bash
pnpm lint
```

## 📋 Dependencies

### Production Dependencies

- `@modelcontextprotocol/sdk` - MCP (Model Context Protocol) SDK
- `@prisma/client` - Prisma ORM クライアント
- `next` - Next.js フレームワーク
- `server-only` - サーバーサイド専用マーカー

### Development Dependencies

- TypeScript
- ESLint
- Prettier
- Bun (テストランナー)

## 🏗️ アーキテクチャ

このパッケージは以下の原則に基づいて設計されています：

1. **環境分離**: サーバーとクライアントの機能を明確に分離
2. **型安全性**: TypeScriptによる厳密な型定義
3. **再利用性**: 複数のアプリケーションで共有可能
4. **セキュリティ**: 適切な環境でのみ実行される設計

## 📝 注意事項

- サーバーサイド専用関数をクライアントサイドで使用しようとすると、空の配列が返されます
- MCP SDK関連の機能はNode.js環境でのみ動作します
- ファビコン取得機能は外部APIに依存しているため、ネットワーク接続が必要です

## 🤝 貢献

新しいユーティリティ関数を追加する際は、適切なディレクトリに配置してください：

- **両環境対応**: `src/` 直下
- **サーバー専用**: `src/server/`
- **クライアント専用**: `src/client/`

各ディレクトリの `index.ts` でエクスポートを忘れずに行ってください。
