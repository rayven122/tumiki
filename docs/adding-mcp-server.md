# Tumiki に新しい MCP サーバーを追加する方法

このドキュメントでは、Tumiki システムに新しい MCP (Model Context Protocol) サーバーを追加する手順を説明します。

## 概要

Tumiki への MCP サーバー追加は以下の流れで行います：

1. 依存関係の追加
2. サーバー定義の追加
3. ロゴファイルの配置
4. データベースへの反映

## 手順

### 1. 依存関係の追加

まず、`packages/scripts/package.json` に MCP サーバーパッケージを追加します：

```bash
cd packages/scripts
pnpm add @your-org/mcp-server
```

例：
```json
{
  "dependencies": {
    "@playwright/mcp": "^0.0.29",
    "@suekou/mcp-notion-server": "^1.2.4",
    "@modelcontextprotocol/server-github": "^2025.4.8",
    "@upstash/context7-mcp": "^1.0.14"
  }
}
```

### 2. サーバー定義の追加

`packages/scripts/src/constants/mcpServers.ts` に新しいサーバー定義を追加します：

```typescript
export const MCP_SERVERS = [
  // 既存のサーバー定義...
  {
    name: "Your MCP Server Name",        // サーバーの表示名（一意である必要があります）
    iconPath: "/logos/your-server.svg",  // ロゴファイルのパス
    command: "node",                     // 実行コマンド
    args: ["node_modules/@your-org/mcp-server/dist/index.js"], // コマンド引数
    envVars: [],                         // 必要な環境変数（例: ["API_KEY", "API_SECRET"]）
    isPublic: true,                      // 公開サーバーかどうか
  },
] as const satisfies Prisma.McpServerCreateWithoutToolsInput[];
```

#### 設定項目の説明

- **name**: UI に表示されるサーバー名。システム内で一意である必要があります
- **iconPath**: `/apps/manager/public/` からの相対パス
- **command**: サーバーを起動するコマンド（通常は `node`）
- **args**: コマンドに渡す引数の配列
- **envVars**: サーバーが必要とする環境変数名の配列
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

## 詳細な仕組み

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

実際のコミット例として、Playwright MCP の追加（コミット 9886658）では：

1. `@playwright/mcp` パッケージを追加
2. `mcpServers.ts` に定義を追加
3. `/logos/playwright.svg` を配置
4. データベースに反映

このプロセスに従うことで、新しい MCP サーバーを Tumiki システムに統合できます。