# YouTube MCP Server

YouTube Data API v3 を使用した MCP (Model Context Protocol) サーバーです。

## 機能

### 動画関連

- `get_video` - YouTube動画の詳細情報を取得
- `search_videos` - YouTube動画を検索

### チャンネル関連

- `get_channel` - チャンネル情報を取得
- `list_channel_videos` - チャンネルの動画一覧を取得

### プレイリスト関連

- `get_playlist` - プレイリスト情報を取得
- `get_playlist_items` - プレイリスト内の動画一覧を取得

## セットアップ

### 1. YouTube Data API v3 キーの取得

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. 「APIとサービス」→「ライブラリ」から「YouTube Data API v3」を有効化
4. 「APIとサービス」→「認証情報」からAPIキーを作成

### 2. ビルド

```bash
cd packages/youtube-mcp
pnpm clean
pnpm install
pnpm build
```

## 使用方法（スタンドアロン）

このMCPサーバーは、Tumikiマネージャーを経由せずに、スタンドアロンで直接利用することができます。

プロジェクトルートの `.mcp.json` に以下を追加：

```json
{
  "mcpServers": {
    "youtube-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["packages/youtube-mcp/dist/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "${YOUTUBE_API_KEY}"
      }
    }
  }
}
```

環境変数を設定してエディタを再起動すると、YouTube MCPツールが利用可能になります。

## 制限事項

- YouTube Data API v3 のクォータ制限があります（デフォルト: 10,000ユニット/日）
- APIキーは適切に管理し、公開しないよう注意してください
