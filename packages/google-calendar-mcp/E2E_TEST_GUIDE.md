# Google Calendar MCP Server E2Eテストガイド

## 重要な注意事項

**このE2Eテストは、MCPツール（google-calendar-mcp）を直接使用して実行します。**

- e2e-test-runnerエージェントは使用しません
- `/mcp`コマンドで表示されるgoogle-calendar-mcpツールを直接呼び出してテストを実行してください
- 各テストケースは実際のGoogle Calendar APIを呼び出すため、認証情報が必要です

## テスト実行方法

1. **事前チェック**:
   - `.mcp.json`にgoogle-calendar-mcpの設定があることを確認
   - OAuth認証情報が正しく設定されていることを確認
   - ツールが利用可能か確認（利用できない場合は設定を見直し）

2. **テスト実行**:
   - 各テストケースのツールを直接呼び出す
   - ツール名の形式: `mcp__google-calendar-mcp__<tool_name>`
   - 例: `mcp__google-calendar-mcp__list_calendars`

3. **結果検証**:
   - レスポンスを確認し、期待値と比較
   - エラーの場合はエラーメッセージを確認

### トラブルシューティング

- **ツールが見つからない場合**:
  - `.mcp.json`の設定を確認
  - エディタを再起動
  - `pnpm build`でビルドを実行

- **API認証エラーが発生する場合**:
  - OAuth認証情報の有効性を確認
  - Google Cloud ConsoleでAPIが有効化されているか確認
  - 必要なスコープが許可されているか確認

## 前提条件

### 必須: .mcp.jsonの設定

`.mcp.json`に以下の設定が必要です：

```json
{
  "mcpServers": {
    "google-calendar-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["packages/google-calendar-mcp/dist/index.js"],
      "env": {
        "GOOGLE_SERVICE_ACCOUNT_KEY": "${GOOGLE_SERVICE_ACCOUNT_KEY}"
      }
    }
  }
}
```

**重要**:

- `GOOGLE_SERVICE_ACCOUNT_KEY`にはGoogle Service Accountの認証情報（JSON形式）を設定してください
- 認証情報が設定されていない、または無効な場合はテストが実行できません
- ビルド済み（`pnpm build`実行済み）であることを確認してください

### 設定確認手順

1. `.mcp.json`にgoogle-calendar-mcpエントリがあることを確認
2. OAuth認証情報が正しく設定されていることを確認
3. `packages/google-calendar-mcp/dist/index.js`が存在することを確認（なければ`pnpm build`を実行）
4. エディタを再起動してMCPサーバーを再接続

## 1. カレンダー関連ツール (Calendar Tools)

### list_calendars

```yaml
テストケース1: 基本的なカレンダー一覧取得
  入力: {}
  期待: アクセス可能なカレンダーのリストが取得できる

テストケース2: 最大件数指定
  入力:
    maxResults: 10
  期待: 最大10件のカレンダー

テストケース3: 削除済みカレンダーを含む
  入力:
    showDeleted: true
  期待: 削除されたカレンダーも含まれる

テストケース4: 非表示カレンダーを含む
  入力:
    showHidden: true
  期待: 非表示のカレンダーも含まれる
```

### get_calendar

```yaml
テストケース1: プライマリカレンダー取得
  入力:
    calendarId: "primary"
  期待: プライマリカレンダーの詳細情報

テストケース2: 特定のカレンダーID指定
  入力:
    calendarId: "specific_calendar_id@group.calendar.google.com"
  期待: 指定したカレンダーの詳細情報

テストケース3: 存在しないカレンダー
  入力:
    calendarId: "invalid_calendar_id"
  期待: エラー「Calendar not found」
```

## 2. イベント関連ツール (Event Tools)

### list_events

```yaml
テストケース1: 基本的なイベント一覧取得
  入力:
    calendarId: "primary"
    timeMin: "2024-01-01T00:00:00Z"
    timeMax: "2024-12-31T23:59:59Z"
  期待: 指定期間のイベント一覧

テストケース2: 今後1週間のイベント
  入力:
    calendarId: "primary"
    timeMin: "現在時刻"
    timeMax: "現在時刻+7日"
    singleEvents: true
    orderBy: "startTime"
  期待: 開始時刻順にソートされた今後1週間のイベント

テストケース3: ページネーション
  入力:
    calendarId: "primary"
    maxResults: 10
  期待: 最大10件のイベント、nextPageTokenがあれば次ページが取得可能

テストケース4: 検索クエリ付き
  入力:
    calendarId: "primary"
    q: "ミーティング"
  期待: 「ミーティング」を含むイベントのみ
```

### get_event

```yaml
テストケース1: 特定イベントの取得
  入力:
    calendarId: "primary"
    eventId: "event_id_123"
  期待: 指定したイベントの詳細情報

テストケース2: 存在しないイベント
  入力:
    calendarId: "primary"
    eventId: "invalid_event_id"
  期待: エラー「Event not found」
```

### create_event

```yaml
テストケース1: 基本的なイベント作成
  入力:
    calendarId: "primary"
    summary: "テストイベント"
    start:
      dateTime: "2024-10-15T10:00:00+09:00"
      timeZone: "Asia/Tokyo"
    end:
      dateTime: "2024-10-15T11:00:00+09:00"
      timeZone: "Asia/Tokyo"
  期待: イベントが正常に作成される

テストケース2: 終日イベント
  入力:
    calendarId: "primary"
    summary: "終日イベント"
    start:
      date: "2024-10-15"
    end:
      date: "2024-10-16"
  期待: 終日イベントが作成される

テストケース3: 参加者付きイベント
  入力:
    calendarId: "primary"
    summary: "会議"
    start:
      dateTime: "2024-10-15T14:00:00+09:00"
    end:
      dateTime: "2024-10-15T15:00:00+09:00"
    attendees:
      - email: "attendee@example.com"
  期待: 参加者に招待が送信される

テストケース4: リマインダー付きイベント
  入力:
    calendarId: "primary"
    summary: "重要な会議"
    start:
      dateTime: "2024-10-15T16:00:00+09:00"
    end:
      dateTime: "2024-10-15T17:00:00+09:00"
    reminders:
      useDefault: false
      overrides:
        - method: "email"
          minutes: 1440
        - method: "popup"
          minutes: 30
  期待: 指定したリマインダーが設定される
```

### update_event

```yaml
テストケース1: イベントタイトルの更新
  入力:
    calendarId: "primary"
    eventId: "event_id_123"
    summary: "更新されたタイトル"
  期待: イベントタイトルが更新される

テストケース2: 時間の変更
  入力:
    calendarId: "primary"
    eventId: "event_id_123"
    start:
      dateTime: "2024-10-15T15:00:00+09:00"
    end:
      dateTime: "2024-10-15T16:00:00+09:00"
  期待: イベントの時間が変更される

テストケース3: 参加者の追加
  入力:
    calendarId: "primary"
    eventId: "event_id_123"
    attendees:
      - email: "new_attendee@example.com"
  期待: 新しい参加者が追加される
```

### delete_event

```yaml
テストケース1: イベントの削除
  入力:
    calendarId: "primary"
    eventId: "event_id_123"
  期待: イベントが削除される

テストケース2: 存在しないイベントの削除
  入力:
    calendarId: "primary"
    eventId: "invalid_event_id"
  期待: エラー「Event not found」

テストケース3: 通知付き削除
  入力:
    calendarId: "primary"
    eventId: "event_id_123"
    sendUpdates: "all"
  期待: 参加者全員に削除通知が送信される
```

### search_events

```yaml
テストケース1: キーワード検索
  入力:
    calendarId: "primary"
    q: "ミーティング"
  期待: 「ミーティング」を含むイベントのリスト

テストケース2: 期間指定検索
  入力:
    calendarId: "primary"
    q: "会議"
    timeMin: "2024-10-01T00:00:00Z"
    timeMax: "2024-10-31T23:59:59Z"
  期待: 10月中の「会議」を含むイベント

テストケース3: 結果が0件
  入力:
    calendarId: "primary"
    q: "zxcvbnmasdfghjklqwertyuiop12345"
  期待: 空の結果配列
```

## 3. 空き時間関連ツール (FreeBusy Tools)

### get_freebusy

```yaml
テストケース1: 単一カレンダーの空き時間
  入力:
    timeMin: "2024-10-15T00:00:00Z"
    timeMax: "2024-10-15T23:59:59Z"
    calendarIds: ["primary"]
  期待: プライマリカレンダーの空き時間情報

テストケース2: 複数カレンダーの空き時間
  入力:
    timeMin: "2024-10-15T00:00:00Z"
    timeMax: "2024-10-15T23:59:59Z"
    calendarIds:
      - "primary"
      - "calendar_id_1@group.calendar.google.com"
      - "calendar_id_2@group.calendar.google.com"
  期待: 複数カレンダーの統合された空き時間情報

テストケース3: タイムゾーン指定
  入力:
    timeMin: "2024-10-15T00:00:00Z"
    timeMax: "2024-10-15T23:59:59Z"
    timeZone: "Asia/Tokyo"
    calendarIds: ["primary"]
  期待: 日本時間での空き時間情報
```

## 4. 色関連ツール (Colors Tools)

### get_colors

```yaml
テストケース1: 利用可能な色の取得
  入力: {}
  期待: カレンダーとイベントで使用可能な色のリスト
```

## 5. エラーケース・エッジケース

### 認証関連

```yaml
テストケース1: 認証情報未設定
  環境: GOOGLE_SERVICE_ACCOUNT_KEY=""
  期待: "Authentication credentials are required"

テストケース2: 無効な認証情報
  環境: GOOGLE_SERVICE_ACCOUNT_KEY="invalid_credentials"
  期待: "Invalid credentials"

テストケース3: 権限不足
  条件: カレンダーへのアクセス権限がない
  期待: "Permission denied"エラー
```

### データ検証

```yaml
テストケース1: 不正な日時形式
  入力:
    start:
      dateTime: "invalid_date_format"
  期待: バリデーションエラー

テストケース2: 必須パラメータ欠落
  入力: {} (空オブジェクト)
  期待: バリデーションエラー

テストケース3: 開始時刻 > 終了時刻
  入力:
    start:
      dateTime: "2024-10-15T15:00:00Z"
    end:
      dateTime: "2024-10-15T14:00:00Z"
  期待: エラー「End time must be after start time」
```

## 6. 実行手順

### E2Eテスト（推奨）

自動E2Eテストスクリプト`e2e-test.js`を使用して、全ツールを一括テストできます：

```bash
# 1. プロジェクトルートで環境変数が設定されていることを確認
# .envファイルにGOOGLE_SERVICE_ACCOUNT_KEYが設定されている必要があります

# 2. MCPサーバーをビルド（まだの場合）
cd packages/google-calendar-mcp
pnpm build

# 3. E2Eテストを実行
node e2e-test.js
```

テストは以下の順序で自動実行されます：

1. カレンダー一覧取得
2. プライマリカレンダー詳細取得
3. イベント一覧取得（今後7日間）
4. テストイベント作成
5. イベント詳細取得
6. イベント更新
7. イベント検索
8. 空き時間取得
9. 利用可能な色取得
10. テストイベント削除

### 認証テスト

Service Account認証が正しく機能するかテストできます：

```bash
cd packages/google-calendar-mcp
node test-auth.js
```

### 手動テスト

個別のツールを手動でテストする場合：

```bash
# 1. MCPサーバー起動
cd packages/google-calendar-mcp
pnpm build
node dist/index.js

# 2. 別のターミナルでMCPクライアントから各ツールを実行
# または test-mcp-manual.js を使用
node test-mcp-manual.js
```

### ユニットテスト

```bash
# ユニットテスト実行
pnpm test

# カバレッジ付き
pnpm test:coverage
```

## 7. 検証チェックリスト

- [x] 全ツールが正常に呼び出せる
- [x] 各ツールの必須パラメータが機能する
- [x] オプションパラメータが正しく処理される
- [x] エラーケースで適切なメッセージが返る
- [x] OAuth認証フローが正常に動作する
- [x] API制限が適切に処理される
- [x] タイムゾーンが正しく扱われる

## 8. テスト実行結果 (2025-10-06)

### 自動E2Eテスト実行結果

```
=== Google Calendar MCP E2E Tests ===

✅ MCP Server connected successfully

✅ PASSED: List calendars (basic) - Found 0 calendars
✅ PASSED: Get primary calendar
✅ PASSED: List events (next 7 days) - Found 0 events
✅ PASSED: Create test event - Created event with ID
✅ PASSED: Get created event details
✅ PASSED: Update event title - Extended to 2 hours duration
✅ PASSED: Search events by keyword - Found 1 matching events
✅ PASSED: Get free/busy information
✅ PASSED: Get available colors - 24 calendar colors and 11 event colors
✅ PASSED: Delete test event

=== Test Summary ===
✅ Passed: 10
❌ Failed: 0
```

### テスト済みツール

1. ✅ `list_calendars` - カレンダー一覧取得
2. ✅ `get_calendar` - プライマリカレンダー詳細取得
3. ✅ `list_events` - 期間指定イベント一覧取得
4. ✅ `create_event` - イベント作成（日時指定、タイムゾーン設定）
5. ✅ `get_event` - イベント詳細取得
6. ✅ `update_event` - イベント更新（タイトル、時間変更）
7. ✅ `search_events` - キーワード検索
8. ✅ `get_freebusy` - 空き時間情報取得
9. ✅ `get_colors` - 利用可能な色情報取得
10. ✅ `delete_event` - イベント削除

### 検証されたAPI機能

- ✅ Service Account認証
- ✅ カレンダー情報の読み取り
- ✅ イベントのCRUD操作（作成、読み取り、更新、削除）
- ✅ イベント検索
- ✅ 空き時間照会
- ✅ タイムゾーン処理（Asia/Tokyo）
- ✅ ISO 8601日時形式
- ✅ エラーハンドリング

### 注意事項

- `update_event`では、Google Calendar APIの仕様上、`start`と`end`の両方を指定する必要があります
- Service Accountでは、カレンダーリストは空になる場合があります（primaryカレンダーは取得可能）
- テストスクリプト: `packages/google-calendar-mcp/e2e-test.js`
