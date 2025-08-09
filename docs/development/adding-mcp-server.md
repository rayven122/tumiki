# Tumiki に新しい MCP サーバーを追加する方法

このドキュメントでは、Tumiki システムに新しい MCP (Model Context Protocol) サーバーを追加する手順を説明します。

> **ヒント**: Claude Code を使用している場合、カスタムスラッシュコマンド `/add-mcp-server` を使用して自動的に MCP サーバーを追加できます。詳細は[カスタムスラッシュコマンド](#カスタムスラッシュコマンド)のセクションを参照してください。

## 概要

Tumiki への MCP サーバー追加は以下の流れで行います：

1. 依存関係の追加（packages/scripts と apps/proxyServer の両方）
2. サーバー定義の追加
3. ロゴファイルの配置
4. データベースへの反映

## 手順

### 1. 依存関係の追加

MCP サーバーパッケージは **2つの場所** に追加する必要があります：

#### 1.1. packages/scripts への追加

```bash
cd packages/scripts
pnpm add @your-org/mcp-server
```

#### 1.2. apps/proxyServer への追加

```bash
cd apps/proxyServer
pnpm add @your-org/mcp-server
```

例：

```json
{
  "dependencies": {
    "@playwright/mcp": "^0.0.29",
    "@suekou/mcp-notion-server": "^1.2.4",
    "@modelcontextprotocol/server-github": "^2025.4.8",
    "@upstash/context7-mcp": "^1.0.14",
    "task-master-ai": "^0.18.0"
  }
}
```

**重要**: 両方のディレクトリに同じパッケージを追加することで、scripts での upsertTools と proxyServer での実行時の両方で MCP サーバーが利用可能になります。

### 2. サーバー定義の追加

`packages/scripts/src/constants/mcpServers.ts` に新しいサーバー定義を追加します：

```typescript
export const MCP_SERVERS = [
  // 既存のサーバー定義...
  {
    name: "Your MCP Server Name", // サーバーの表示名（一意である必要があります）
    iconPath: "/logos/your-server.svg", // ロゴファイルのパス
    command: "node", // 実行コマンド
    args: ["node_modules/@your-org/mcp-server/dist/index.js"], // コマンド引数
    envVars: [], // 必要な環境変数名の配列（例: ["API_KEY", "API_SECRET"]）
    isPublic: true, // 公開サーバーかどうか
  },
] as const satisfies Prisma.McpServerCreateWithoutToolsInput[];
```

#### 設定項目の説明

- **name**: UI に表示されるサーバー名。システム内で一意である必要があります
- **iconPath**: `/apps/manager/public/` からの相対パス
- **command**: サーバーを起動するコマンド（通常は `node`）
- **args**: コマンドに渡す引数の配列
  - args 内に環境変数名が含まれている場合、実行時に実際の値に置換されます
  - 例: `["--api-key", "API_KEY"]` → `["--api-key", "実際のAPIキー値"]`
- **envVars**: サーバーが必要とする環境変数名の配列
  - ユーザーが設定した値は2つの方法で利用されます：
    1. args 内の文字列置換（上記参照）
    2. 子プロセスの環境変数として設定（env プロパティ）
- **isPublic**: すべてのユーザーに公開するかどうか

### 3. ロゴファイルの配置

サーバーのロゴを以下の場所に配置します：

```
apps/manager/public/logos/your-server.svg
```

推奨事項：

- SVG 形式を使用
- 正方形のアスペクト比
- 透明背景
- ファイルサイズは 50KB 以下

### 4. データベースへの反映

すべての設定が完了したら、データベースに反映します：

```bash
cd packages/scripts
pnpm upsertAll
```

このコマンドは以下を実行します：

1. `upsertMcpServers`: MCP サーバー定義をデータベースに挿入/更新
2. `upsertMcpTools`: 各サーバーに接続してツール情報を取得・保存

## 動作確認

### 1. 開発環境での確認

```bash
# 開発サーバーを起動
pnpm dev

# ブラウザで http://localhost:3000 にアクセス
# ダッシュボードから新しい MCP サーバーが追加できることを確認
```

### 2. プロキシサーバーでの動作確認

```bash
# MCP Inspector を使用して接続テスト
pnpm inspector
```

## トラブルシューティング

### サーバーがリストに表示されない

1. `pnpm upsertAll` を実行したか確認
2. データベースの `McpServer` テーブルにレコードが存在するか確認
3. `isPublic: true` が設定されているか確認

### ツールが表示されない

1. MCP サーバーが正しく起動するか確認
2. `packages/scripts` ディレクトリで直接サーバーを起動してテスト：
   ```bash
   node node_modules/@your-org/mcp-server/dist/index.js
   ```
3. `upsertMcpTools` スクリプトのログを確認

### 環境変数エラー

1. `envVars` 配列に必要な環境変数名がすべて含まれているか確認
2. ユーザーが設定画面で環境変数を入力しているか確認
3. args 内で環境変数を参照している場合、正しい変数名を使用しているか確認
   - 例: `args: ["--api-key", "API_KEY"]` の場合、`envVars: ["API_KEY"]` が必要

## 詳細な仕組み

### 環境変数の処理フロー

ProxyServer での環境変数処理の流れ：

1. **ユーザー設定の取得**: `UserMcpServerConfig` テーブルから暗号化された環境変数を取得
2. **復号化**: Prisma の暗号化機能により自動的に復号化
3. **args の置換**:
   - `args` 配列内の各要素をスキャン
   - 環境変数名が含まれていれば、実際の値に置換
   - 例: `"--api-key=API_KEY"` → `"--api-key=sk-abc123..."`
4. **env の設定**:
   - STDIO トランスポートの場合、環境変数オブジェクトを `env` プロパティに設定
   - これにより子プロセスから `process.env.API_KEY` でアクセス可能

### データベーススキーマ

MCP サーバー関連のテーブル：

- **McpServer**: サーバー定義（名前、コマンド、引数など）
- **Tool**: 各サーバーが提供するツール
- **UserMcpServerConfig**: ユーザー固有の設定（暗号化された環境変数を含む）
- **UserMcpServerInstance**: 実行中のサーバーインスタンス

### セキュリティ

- 環境変数は Prisma の暗号化機能により保護されます
- API キーは生成時にハッシュ化されます
- ユーザーごとに独立した設定が管理されます

### トランスポートタイプ

Tumiki は以下のトランスポートをサポート：

- **STDIO**: ローカルプロセスとの通信（デフォルト）
- **SSE**: Server-Sent Events によるリモート通信

## 参考例

### Playwright MCP の追加例（コミット 9886658）

1. `@playwright/mcp` パッケージを両方のディレクトリに追加
2. `mcpServers.ts` に定義を追加
3. `/logos/playwright.svg` を配置
4. データベースに反映

### Task Master AI の追加例

1. **依存関係の追加**:

   ```bash
   # packages/scripts に追加
   cd packages/scripts
   pnpm add task-master-ai

   # apps/proxyServer に追加
   cd apps/proxyServer
   pnpm add task-master-ai
   ```

2. **サーバー定義の追加**:

   ```typescript
   {
     name: "Task Master AI",
     iconPath: "/logos/task-master.svg",
     command: "node",
     args: ["node_modules/task-master-ai/index.js"],
     envVars: [
       "ANTHROPIC_API_KEY",
       "PERPLEXITY_API_KEY",
       "OPENAI_API_KEY",
       "GOOGLE_API_KEY",
       "MISTRAL_API_KEY",
       "OPENROUTER_API_KEY",
       "XAI_API_KEY",
       "AZURE_OPENAI_API_KEY",
       "OLLAMA_API_KEY"
     ],
     isPublic: true,
   }
   ```

3. **ロゴファイルの作成**: タスクリストアイコンの SVG を作成・配置

4. **データベースへの反映**: `pnpm upsertAll` を実行

このプロセスに従うことで、新しい MCP サーバーを Tumiki システムに統合できます。

## カスタムスラッシュコマンド

Claude Code を使用している場合、以下のカスタムスラッシュコマンドが利用可能です：

### /add-mcp-server

MCP サーバーを自動的に追加するコマンドです。

```bash
# DeepL MCP サーバーを追加する例
/add-mcp-server https://github.com/DeepLcom/deepl-mcp-server

# npmパッケージ名で追加
/add-mcp-server task-master-ai "Task Master AI"

# 環境変数を指定して追加
/add-mcp-server figma-developer-mcp "Figma Context" --env FIGMA_API_KEY
```

このコマンドは以下を自動的に実行します：

1. 両方のディレクトリへの依存関係追加
2. サーバー定義の更新
3. ロゴファイルの生成
4. データベースへの反映

### その他の利用可能なコマンド

`.claude/commands/` ディレクトリには以下のカスタムコマンドがあります：

- **/commit-and-pr**: コミットとプルリクエストを一度に作成
- **/pr**: プルリクエストを作成
- **/pr-review**: プルリクエストのレビューを実行
- **/weekly-report**: 週次レポートを生成

これらのコマンドは Claude Code で作業を効率化するために設計されています。
