# Google Spreadsheet MCP Server

Google Sheets の読み書き、管理、共有機能を提供する MCP (Model Context Protocol) サーバーです。

## 機能

### スプレッドシート管理

- **list_spreadsheets** - アクセス可能なスプレッドシート一覧の取得
- **get_spreadsheet** - スプレッドシートの詳細情報取得
- **create_spreadsheet** - 新規スプレッドシートの作成

### シート操作

- **list_sheets** - スプレッドシート内のシート一覧取得
- **create_sheet** - 新規シートの追加
- **delete_sheet** - シートの削除
- **get_sheet_data** - 指定範囲のデータ読み取り
- **update_cells** - セルデータの更新
- **batch_update_cells** - 複数範囲の一括更新
- **append_rows** - 行の追加
- **clear_range** - 指定範囲のクリア

### 共有・権限管理

- **share_spreadsheet** - スプレッドシートの共有設定
- **get_permissions** - 権限一覧の取得
- **remove_permission** - 権限の削除

## 認証方式

以下の認証方式をサポートしています：

### 1. Service Account (推奨)

```bash
export GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"..."}'
```

### 2. OAuth 2.0

```bash
export GOOGLE_OAUTH_CLIENT_ID="your-client-id"
export GOOGLE_OAUTH_CLIENT_SECRET="your-client-secret"
export GOOGLE_OAUTH_REFRESH_TOKEN="your-refresh-token"
```

### 3. API Key (読み取り専用)

```bash
export GOOGLE_API_KEY="your-api-key"
```

### 4. Application Default Credentials (ADC)

Google Cloud 環境で実行する場合、自動的に ADC が使用されます。

## セットアップ

### 1. Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. プロジェクトを作成または選択
3. Google Sheets API と Google Drive API を有効化
4. 認証情報を作成（Service Account または OAuth 2.0）

### 2. Service Account の設定（推奨）

1. IAM & Admin > Service Accounts から新規作成
2. JSON キーをダウンロード
3. 環境変数に設定：

```bash
export GOOGLE_SERVICE_ACCOUNT_KEY=$(cat path/to/service-account-key.json)
```

### 3. OAuth 2.0 の設定

1. APIs & Services > Credentials から OAuth 2.0 Client ID を作成
2. リフレッシュトークンを取得（別途 OAuth フロー実装が必要）
3. 環境変数に設定

## 使用例

### スプレッドシート一覧の取得

```json
{
  "tool": "list_spreadsheets",
  "arguments": {
    "query": "プロジェクト"
  }
}
```

### データの読み取り

```json
{
  "tool": "get_sheet_data",
  "arguments": {
    "spreadsheetId": "1234567890abcdef",
    "range": "Sheet1!A1:D10"
  }
}
```

### データの更新

```json
{
  "tool": "update_cells",
  "arguments": {
    "spreadsheetId": "1234567890abcdef",
    "range": "Sheet1!A1:B2",
    "values": [
      ["名前", "年齢"],
      ["田中", 25]
    ]
  }
}
```

### スプレッドシートの共有

```json
{
  "tool": "share_spreadsheet",
  "arguments": {
    "spreadsheetId": "1234567890abcdef",
    "email": "user@example.com",
    "type": "user",
    "role": "writer",
    "sendNotificationEmail": true
  }
}
```

## 開発

### ビルド

```bash
pnpm build
```

### テスト

```bash
pnpm test
```

### 型チェック

```bash
pnpm typecheck
```

## ライセンス

MIT
