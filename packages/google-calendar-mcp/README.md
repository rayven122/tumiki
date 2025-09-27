# Google Calendar MCP Server

Google Calendar API を使用してカレンダーとイベントを管理する MCP (Model Context Protocol) サーバーです。

## 機能

- **カレンダー管理**
  - カレンダー一覧の取得
  - 特定カレンダーの詳細情報取得

- **イベント管理**
  - イベント一覧の取得
  - イベントの作成、更新、削除
  - イベント検索
  - 特定イベントの詳細情報取得

- **スケジューリング**
  - 空き時間の確認
  - 複数カレンダーの空き時間チェック

- **ユーティリティ**
  - カレンダーとイベントの色情報取得

## 認証方法

以下の認証方法をサポートしています：

### 1. サービスアカウント認証

```bash
export GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
```

### 2. OAuth2認証

```bash
export GOOGLE_OAUTH_CLIENT_ID="your-client-id"
export GOOGLE_OAUTH_CLIENT_SECRET="your-client-secret"
export GOOGLE_OAUTH_REFRESH_TOKEN="your-refresh-token"
```

### 3. APIキー認証（読み取り専用）

```bash
export GOOGLE_API_KEY="your-api-key"
```

### 4. Application Default Credentials (ADC)

```bash
# 環境変数が設定されていない場合、ADCが使用されます
```

## 利用可能なツール

### カレンダー操作

- `list_calendars` - アクセス可能なカレンダー一覧を取得
- `get_calendar` - 特定カレンダーの詳細情報を取得

### イベント操作

- `list_events` - 指定期間内のイベント一覧を取得
- `get_event` - 特定イベントの詳細情報を取得
- `create_event` - 新しいイベントを作成
- `update_event` - 既存イベントを更新
- `delete_event` - イベントを削除
- `search_events` - フリーテキストでイベントを検索

### スケジューリング

- `get_freebusy` - 複数カレンダーの空き時間を確認

### ユーティリティ

- `get_colors` - カレンダーとイベントで利用可能な色を取得

## 開発

### セットアップ

```bash
pnpm install
```

### ビルド

```bash
pnpm build
```

### テスト

```bash
pnpm test
pnpm test:watch    # ウォッチモード
pnpm test:coverage # カバレッジ測定
```

### 型チェック

```bash
pnpm typecheck
pnpm typecheck:dev # 高速版（開発用）
```

### リント・フォーマット

```bash
pnpm lint
pnpm lint:fix
pnpm format
```

## Google Cloud の設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. Google Calendar API を有効化
3. 認証情報を作成（サービスアカウントまたはOAuth2）
4. 必要に応じてスコープを設定：
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.settings.readonly`

## ライセンス

このパッケージは Tumiki プロジェクトの一部であり、プライベートパッケージです。
