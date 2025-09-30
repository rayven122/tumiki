# Google Spreadsheet MCP Server E2Eテストガイド

## 重要な注意事項

**このE2Eテストは、MCPツール（google-spreadsheet-mcp）を直接使用して実行します。**

- e2e-test-runnerエージェントは使用しません
- `/mcp`コマンドで表示されるgoogle-spreadsheet-mcpツールを直接呼び出してテストを実行してください
- 各テストケースは実際のGoogle Sheets APIを呼び出すため、認証情報が必要です

## テスト実行方法

1. **事前チェック**:
   - `.mcp.json`にgoogle-spreadsheet-mcpの設定があることを確認
   - 認証情報が正しく設定されていることを確認
   - ツールが利用可能か確認（利用できない場合は設定を見直し）

2. **テスト実行**:
   - 各テストケースのツールを直接呼び出す
   - ツール名の形式: `mcp__google-spreadsheet-mcp__<tool_name>`
   - 例: `mcp__google-spreadsheet-mcp__create_spreadsheet`

3. **結果検証**:
   - レスポンスを確認し、期待値と比較
   - エラーの場合はエラーメッセージを確認

### トラブルシューティング

- **ツールが見つからない場合**:
  - `.mcp.json`の設定を確認
  - エディタを再起動
  - `pnpm build`でビルドを実行

- **認証エラーが発生する場合**:
  - 認証情報の有効性を確認
  - Google Cloud Platform コンソールでAPI有効化を確認
  - サービスアカウントの権限を確認

## 前提条件

### 必須: .mcp.jsonの設定

`.mcp.json`に以下の設定が必要です：

```json
{
  "mcpServers": {
    "google-spreadsheet-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["packages/google-spreadsheet-mcp/dist/index.js"],
      "env": {
        "GOOGLE_SERVICE_ACCOUNT_KEY": "your-service-account-key-json",
        "GOOGLE_OAUTH_CLIENT_ID": "your-oauth-client-id",
        "GOOGLE_OAUTH_CLIENT_SECRET": "your-oauth-client-secret",
        "GOOGLE_OAUTH_REFRESH_TOKEN": "your-oauth-refresh-token"
      }
    }
  }
}
```

**重要**:

- サービスアカウント認証またはOAuth2認証のいずれかを設定してください
- Google Sheets API v4とGoogle Drive API v3が有効化されている必要があります
- ビルド済み（`pnpm build`実行済み）であることを確認してください

### 設定確認手順

1. `.mcp.json`にgoogle-spreadsheet-mcpエントリがあることを確認
2. 認証情報が正しく設定されていることを確認
3. `packages/google-spreadsheet-mcp/dist/index.js`が存在することを確認（なければ`pnpm build`を実行）
4. エディタを再起動してMCPサーバーを再接続

## 1. スプレッドシート管理ツール (Spreadsheet Management Tools)

### list_spreadsheets

```yaml
テストケース1: 基本的なスプレッドシート一覧取得
  入力: {}
  期待: アクセス可能なスプレッドシートの一覧（ID、名前を含む）

テストケース2: クエリ検索
  入力: query: "テスト"
  期待: "テスト"を含む名前のスプレッドシートのみ

テストケース3: 存在しないクエリ
  入力: query: "存在しないスプレッドシート名12345"
  期待: 空の配列

テストケース4: 権限なしの場合
  条件: 認証情報が無効
  期待: 認証エラー
```

### get_spreadsheet

```yaml
テストケース1: 有効なスプレッドシートID
  入力: spreadsheetId: "your-test-spreadsheet-id"
  期待: スプレッドシート詳細情報（タイトル、シート一覧、URL等）

テストケース2: 無効なスプレッドシートID
  入力: spreadsheetId: "invalid_id_12345"
  期待: エラーメッセージ「Spreadsheet not found」

テストケース3: アクセス権限なし
  入力: spreadsheetId: "no-access-spreadsheet-id"
  期待: 権限エラー

テストケース4: 削除されたスプレッドシート
  入力: spreadsheetId: "deleted-spreadsheet-id"
  期待: エラーメッセージ
```

### create_spreadsheet

```yaml
テストケース1: 基本的なスプレッドシート作成
  入力: title: "E2Eテスト用スプレッドシート"
  期待: 新しいスプレッドシートID、URLが返される

テストケース2: 初期シート付きで作成
  入力:
    title: "初期シート付きテスト"
    sheetTitles: ["データ", "分析", "レポート"]
  期待: 3つのシートを持つスプレッドシートが作成される

テストケース3: 空のタイトル
  入力: title: ""
  期待: エラーまたはデフォルトタイトルで作成

テストケース4: 特殊文字を含むタイトル
  入力: title: "テスト & データ #1 <特殊文字>"
  期待: 正常に作成される
```

## 2. シート管理ツール (Sheet Management Tools)

### list_sheets

```yaml
テストケース1: 基本的なシート一覧取得
  入力: spreadsheetId: "your-test-spreadsheet-id"
  期待: 全シートの情報（ID、タイトル、インデックス、行列数）

テストケース2: 存在しないスプレッドシート
  入力: spreadsheetId: "invalid_id"
  期待: エラーメッセージ

テストケース3: 空のスプレッドシート
  入力: spreadsheetId: "empty-spreadsheet-id"
  期待: 最低1つのデフォルトシートが存在
```

### create_sheet

```yaml
テストケース1: 基本的なシート作成
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    title: "新しいシート"
  期待: 新しいシートが作成され、シートIDが返される

テストケース2: 行列数指定で作成
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    title: "カスタムサイズシート"
    rowCount: 500
    columnCount: 20
  期待: 指定サイズのシートが作成

テストケース3: 重複するタイトル
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    title: "既存シート名"
  期待: エラーまたは自動的に番号付きで作成

テストケース4: 無効なサイズ
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    title: "無効サイズ"
    rowCount: -1
  期待: エラーまたはデフォルト値で作成
```

### delete_sheet

```yaml
テストケース1: 通常のシート削除
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    sheetId: "削除対象シートID"
  期待: シートが正常に削除される

テストケース2: 最後のシート削除試行
  入力:
    spreadsheetId: "single-sheet-spreadsheet-id"
    sheetId: "唯一のシートID"
  期待: エラー（最低1シートは必要）

テストケース3: 存在しないシートID
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    sheetId: 999999
  期待: エラーメッセージ

テストケース4: 権限不足
  入力:
    spreadsheetId: "read-only-spreadsheet-id"
    sheetId: "valid-sheet-id"
  期待: 権限エラー
```

## 3. データ操作ツール (Data Manipulation Tools)

### get_sheet_data

```yaml
テストケース1: 基本的なデータ取得
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "A1:C10"
  期待: 指定範囲のセルデータが2次元配列で返される

テストケース2: シート名付き範囲指定
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "データ!A1:Z100"
  期待: 指定シートの範囲データ

テストケース3: 無限範囲指定
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "A:A"
  期待: A列の全データ

テストケース4: 空の範囲
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "Z100:Z200"
  期待: 空の配列または null値の配列

テストケース5: 無効な範囲形式
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "無効な範囲"
  期待: エラーメッセージ
```

### update_cells

```yaml
テストケース1: 基本的なセル更新
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "A1:B2"
    values: [["名前", "年齢"], ["田中", 25]]
  期待: 指定範囲が正常に更新される

テストケース2: 数式の設定
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "C1"
    values: [["=SUM(A1:B1)"]]
  期待: 数式が設定され、計算結果が表示される

テストケース3: 異なるデータ型
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "A1:D1"
    values: [["文字列", 123, true, "2024-01-01"]]
  期待: 各データ型が適切に設定される

テストケース4: 範囲とデータサイズの不一致
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "A1:B2"
    values: [["データ1"]]
  期待: 可能な範囲で更新、または適切なエラー

テストケース5: 読み取り専用シート
  入力:
    spreadsheetId: "read-only-spreadsheet-id"
    range: "A1"
    values: [["テスト"]]
  期待: 権限エラー
```

### batch_update_cells

```yaml
テストケース1: 複数範囲の同時更新
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    ranges: [
      { range: "A1:B1", values: [["名前", "年齢"]] },
      { range: "A2:B3", values: [["田中", 25], ["佐藤", 30]] }
    ]
  期待: 全ての範囲が正常に更新される

テストケース2: 異なるシートの同時更新
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    ranges: [
      { range: "シート1!A1", values: [["データ1"]] },
      { range: "シート2!A1", values: [["データ2"]] }
    ]
  期待: 複数シートが同時に更新される

テストケース3: 大量データの更新
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    ranges: [100個の範囲更新]
  期待: 全て正常に処理される、またはバッチサイズ制限エラー

テストケース4: 一部無効な範囲を含む
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    ranges: [
      { range: "A1", values: [["正常"]] },
      { range: "無効範囲", values: [["エラー"]] }
    ]
  期待: エラーで全体がロールバック、または有効な部分のみ更新
```

### append_rows

```yaml
テストケース1: 基本的な行追加
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "A:C"
    values: [["新規データ1", "値1", "備考1"], ["新規データ2", "値2", "備考2"]]
  期待: シートの最後に新しい行が追加される

テストケース2: 空のシートへの追加
  入力:
    spreadsheetId: "empty-spreadsheet-id"
    range: "A:A"
    values: [["最初のデータ"]]
  期待: 1行目に追加される

テストケース3: 大量行の追加
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "A:B"
    values: [1000行のデータ配列]
  期待: 全て正常に追加される、またはサイズ制限エラー

テストケース4: 既存データがあるシートへの追加
  前提: A1:B10に既存データあり
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "A:B"
    values: [["新規", "データ"]]
  期待: 11行目に追加される
```

### clear_range

```yaml
テストケース1: 基本的な範囲クリア
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "A1:C10"
  期待: 指定範囲の全セルが空になる

テストケース2: シート全体のクリア
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "シート1!A:Z"
  期待: シート全体がクリアされる

テストケース3: 単一セルのクリア
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "A1"
  期待: A1セルのみクリア

テストケース4: 無効な範囲
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "無効範囲"
  期待: エラーメッセージ

テストケース5: 既にクリア済みの範囲
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    range: "空の範囲"
  期待: エラーなく正常完了
```

## 4. 権限管理ツール (Permission Management Tools)

### share_spreadsheet

```yaml
テストケース1: ユーザーとの共有
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    permission:
      type: "user"
      role: "writer"
      email: "test@example.com"
  期待: 指定ユーザーに書き込み権限が付与される

テストケース2: 閲覧専用での共有
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    permission:
      type: "user"
      role: "reader"
      email: "viewer@example.com"
  期待: 閲覧権限のみ付与される

テストケース3: 一般公開設定
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    permission:
      type: "anyone"
      role: "reader"
  期待: 誰でも閲覧可能になる

テストケース4: ドメイン共有
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    permission:
      type: "domain"
      role: "writer"
      domain: "example.com"
  期待: 指定ドメインのユーザーに権限付与

テストケース5: 無効なメールアドレス
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    permission:
      type: "user"
      role: "writer"
      email: "invalid-email"
  期待: エラーメッセージ

テストケース6: 通知メール送信
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    permission:
      type: "user"
      role: "writer"
      email: "test@example.com"
    sendNotificationEmails: true
  期待: 権限付与と通知メール送信
```

### get_permissions

```yaml
テストケース1: 基本的な権限一覧取得
  入力: spreadsheetId: "your-test-spreadsheet-id"
  期待: 全ての権限設定（ユーザー、役割、メールアドレス等）が返される

テストケース2: 権限が設定されていないスプレッドシート
  入力: spreadsheetId: "private-spreadsheet-id"
  期待: 所有者権限のみ表示

テストケース3: 多数の権限が設定されたスプレッドシート
  入力: spreadsheetId: "highly-shared-spreadsheet-id"
  期待: 全ての権限が正しく取得される

テストケース4: アクセス権限なし
  入力: spreadsheetId: "no-access-spreadsheet-id"
  期待: 権限エラー
```

### remove_permission

```yaml
テストケース1: 特定ユーザーの権限削除
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    permissionId: "権限ID"
  期待: 指定された権限が削除される

テストケース2: 存在しない権限ID
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    permissionId: "invalid-permission-id"
  期待: エラーメッセージ

テストケース3: 所有者権限の削除試行
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    permissionId: "owner-permission-id"
  期待: エラー（所有者権限は削除不可）

テストケース4: 権限管理権限なし
  条件: 編集権限のみを持つユーザー
  入力:
    spreadsheetId: "your-test-spreadsheet-id"
    permissionId: "any-permission-id"
  期待: 権限エラー
```

## 5. エラーケース・エッジケース

### 認証関連

```yaml
テストケース1: 認証情報未設定
  環境: 全ての環境変数が空
  期待: "Authentication credentials are required"

テストケース2: 無効なサービスアカウントキー
  環境: GOOGLE_SERVICE_ACCOUNT_KEY="invalid_json"
  期待: "Invalid service account credentials"

テストケース3: 無効なOAuth2トークン
  環境: GOOGLE_OAUTH_REFRESH_TOKEN="invalid_token"
  期待: "Invalid OAuth2 credentials"

テストケース4: APIアクセス権限なし
  条件: Google Sheets API未有効化
  期待: "Google Sheets API is not enabled"
```

### レート制限・クォータ

```yaml
テストケース1: APIクォータ超過
  条件: 1日のAPI呼び出し制限に達した状態
  期待: "Quota exceeded"エラー

テストケース2: 同時接続数制限
  条件: 多数の並行リクエスト
  期待: 適切なレート制限処理

テストケース3: 大量データ処理
  条件: 非常に大きなスプレッドシート
  期待: タイムアウトまたは分割処理
```

### データ検証

```yaml
テストケース1: 不正なパラメータ型
  入力: spreadsheetId: 123 (数値)
  期待: 型エラーまたは自動変換

テストケース2: 必須パラメータ欠落
  入力: {} (空オブジェクト)
  期待: バリデーションエラー

テストケース3: 範囲外の値
  入力: rowCount: -1
  期待: エラーまたはデフォルト値

テストケース4: 特殊文字エスケープ
  入力: title: "<script>alert('xss')</script>"
  期待: 適切にエスケープされる

テストケース5: 非常に長い文字列
  入力: title: "A" * 10000
  期待: 制限内にトリミングまたはエラー
```

## 6. パフォーマンステスト

```yaml
並行リクエスト:
  テスト: 同時に10個のツールを実行
  期待: 全て正常に処理される

大量データ処理:
  テスト: 1万行のデータ更新
  期待: メモリ使用量が適切、タイムアウトしない

バッチ処理:
  テスト: 100個のスプレッドシート作成
  期待: 適切なレート制限処理

複雑な数式:
  テスト: 複雑な数式を含むセル更新
  期待: 正常に処理される
```

## 7. 実行手順

### 手動テスト

```bash
# 1. 認証情報設定（サービスアカウントの場合）
export GOOGLE_SERVICE_ACCOUNT_KEY='{"type": "service_account", ...}'

# 2. MCPサーバー起動
cd packages/google-spreadsheet-mcp
pnpm start

# 3. 各ツールを順番にテスト
# Claude/Cursorから各テストケースを実行
```

### 自動テスト

```bash
# ユニットテスト実行
pnpm test

# カバレッジ付き
pnpm test:coverage

# E2Eテスト実行（今後実装予定）
pnpm test:e2e
```

## 8. テスト用リソース

```yaml
テスト用スプレッドシート:
  - 読み取り専用テストシート
  - 書き込み可能テストシート
  - 大量データテストシート
  - 権限設定テストシート

テスト用データ:
  - 文字列データ
  - 数値データ
  - 日付データ
  - 数式データ
  - 日本語・多言語データ

テスト用ユーザー:
  - test@example.com (閲覧権限)
  - editor@example.com (編集権限)
  - admin@example.com (管理権限)
```

## 9. 検証チェックリスト

- [ ] 全ツールが正常に呼び出せる
- [ ] 各ツールの必須パラメータが機能する
- [ ] オプションパラメータが正しく処理される
- [ ] エラーケースで適切なメッセージが返る
- [ ] 大量データでメモリリークがない
- [ ] APIクォータ制限が適切に処理される
- [ ] 並行実行で問題が発生しない
- [ ] 権限設定が正しく動作する
- [ ] データの整合性が保たれる
- [ ] 日本語・特殊文字が正しく処理される

## 10. トラブルシューティング

### よくあるエラーと対処法

```yaml
"spreadsheet not found":
  原因: 無効なスプレッドシートIDまたはアクセス権限なし
  対処: IDの確認、権限設定の確認

"insufficient permissions":
  原因: 操作に必要な権限がない
  対処: スプレッドシートの共有設定を確認

"quota exceeded":
  原因: API呼び出し制限に達した
  対処: 時間をおいて再試行、または課金プランの確認

"invalid range":
  原因: 範囲指定の形式が不正
  対処: A1記法の確認（例: A1:B10, シート名!A1:B10）
```

### デバッグのヒント

- スプレッドシートIDは正しいか？
- 認証情報は有効期限内か？
- Google Cloud Consoleでの API 有効化確認
- ネットワーク接続の確認
- ログでエラーの詳細を確認
