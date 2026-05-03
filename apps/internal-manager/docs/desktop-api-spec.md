# Desktop API 仕様案

## 方針

Tumiki Desktop は、管理サーバー URL を起点に internal-manager と連携する。

現行実装で使っている API は、OIDC 設定取得と監査ログ送信のみ。今後は Desktop 側に「組織で許可された MCP を配布する」「利用申請する」「申請状態を同期する」ための API が必要になる。

## 認証

Desktop は `GET /api/auth/config` で OIDC 設定を取得し、PKCE 認可コードフローでアクセストークンを取得する。

```http
GET {managerUrl}/api/auth/config
```

レスポンス:

```json
{
  "issuer": "https://idp.example.com/realms/tumiki",
  "clientId": "tumiki-internal"
}
```

Desktop は `issuer` の Discovery Document から `authorization_endpoint` / `token_endpoint` を解決する。`redirect_uri` は現行 Desktop 実装では `tumiki://auth/callback` 固定。

注意:

- Desktop 専用 client id は作らず、`OIDC_CLIENT_ID` を共用する。IdP クライアント管理を増やさず、管理画面と Desktop の認証設定を同じ運用単位にするため。
- 監査ログ API の JWT 検証は `issuer`, `audience`, `sub` を検証する。`audience` は `OIDC_CLIENT_ID` と一致する必要がある。

## 現行 API

### `GET /api/auth/config`

Desktop が Manager URL 接続時に OIDC 設定を取得する。

認証: 不要

| フィールド | 型         | 説明                                   |
| ---------- | ---------- | -------------------------------------- |
| `issuer`   | string URL | OIDC Discovery Document の Issuer      |
| `clientId` | string     | Desktop の PKCE フローで使う Client ID |

### `POST /api/internal/audit-logs`

Desktop が MCP 実行ログを internal-manager に送信する。

認証: 必須

```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

リクエスト:

```json
{
  "logs": [
    {
      "mcpServerId": "3",
      "toolName": "list_repos",
      "method": "tools/call",
      "httpStatus": 200,
      "durationMs": 342,
      "inputBytes": 50,
      "outputBytes": 1200,
      "occurredAt": "2026-05-03T10:00:00.000Z"
    }
  ]
}
```

制約:

| フィールド                                | 制約                                                          |
| ----------------------------------------- | ------------------------------------------------------------- |
| `logs`                                    | 1 から 1000 件                                                |
| `mcpServerId`                             | string。別 DB の MCP サーバー ID と対応する想定で FK 制約なし |
| `toolName`                                | 最大 255 文字                                                 |
| `method`                                  | 最大 64 文字                                                  |
| `durationMs`, `inputBytes`, `outputBytes` | 0 以上の integer                                              |
| `errorCode`                               | 任意。エラー時のみ                                            |
| `errorSummary`                            | 任意。最大 500 文字                                           |
| `occurredAt`                              | offset 付き ISO 8601 datetime                                 |

レスポンス:

```json
{
  "inserted": 1
}
```

主なエラー:

| ステータス | 条件                                          |
| ---------: | --------------------------------------------- |
|        400 | JSON 不正、または request body のスキーマ違反 |
|        401 | Bearer token 不在、不正、ユーザー未解決       |

Desktop 側はこの送信をベストエフォートとして扱う。Manager URL 未設定、未ログイン、期限切れ token、通信失敗、API エラーは MCP 実行結果に影響させない。

将来的には Desktop 向け API の prefix を `/api/desktop/v1` に統一するため、`POST /api/desktop/v1/audit-logs` を追加し、既存の `/api/internal/audit-logs` は `v2.0.0` リリースまで互換 endpoint として残す。

## 今後必要になる API

特記がない限り、以下の API はすべて Bearer token 認証を必須とする。

新規 Desktop API は `/api/desktop/v1/...` で提供する。Desktop クライアントと Manager を独立して更新できるようにするため、breaking change は新しい version prefix で追加する。

カタログ ID は DB の連番ではなく、Desktop と internal-manager の間で安定して共有できる文字列 ID を使う。Manager 側を登録元とし、`^[a-z0-9][a-z0-9-]*$` の slug 形式で一意性を DB unique 制約で保証する。例: `github`, `slack`, `google-drive`。

基本 rate limit は `60 requests / minute / user` とする。`policy-sync` のような定期同期 API は個別により低い上限を設ける。

### 1. Desktop セッション API

Desktop がログイン直後に、ユーザー情報・権限・組織プロファイルをまとめて取得する API。

```http
GET /api/desktop/v1/session
```

認証: 必須

返すべき情報:

| フィールド      | 用途                             |
| --------------- | -------------------------------- |
| `user`          | Desktop の表示名、メール、role   |
| `groups`        | 所属グループと同期元             |
| `features`      | Desktop で有効にする機能フラグ   |
| `policyVersion` | 後続の差分同期・キャッシュ無効化 |

`policyVersion` は opaque string として扱う。Manager 側はポリシー更新時刻と内部バージョンカウンタから生成し、Desktop は値を比較せず、次回 `GET /api/desktop/v1/policy-sync?since=...` にそのまま渡す。例: `<ISO8601-timestamp>-<counter>`。

理由:

Desktop 側が「ログイン済みか」だけでなく、「このユーザーに何を見せるか」を判断できるようにするため。

### 2. 利用可能カタログ一覧 API

組織で利用可能、または申請可能な MCP カタログ一覧を返す API。

```http
GET /api/desktop/v1/catalogs?limit=50&cursor=...
```

認証: 必須

返すべき情報:

| フィールド                       | 用途                                                  |
| -------------------------------- | ----------------------------------------------------- |
| `id`                             | 安定した文字列 catalog ID                             |
| `name`, `description`, `iconUrl` | Desktop の一覧表示                                    |
| `status`                         | `available` / `request_required` / `disabled`         |
| `permissions`                    | `{ read: boolean, write: boolean, execute: boolean }` |
| `transportType`, `authType`      | Desktop 側の表示・絞り込み                            |
| `requiredCredentialKeys`         | Desktop で入力を促すキー                              |
| `tools`                          | 代表的なツール名・説明・許可状態                      |

注意:

認証情報や API key は返さない。Desktop 側で入力させる値と、管理側が配布する値は分ける。

ページネーションは cursor-based とし、`limit` のデフォルトは 50、最大は 200 とする。

`cursor` は opaque な base64url 文字列とする。Desktop は中身を解釈せず、レスポンスで返された次ページ用 cursor を次リクエストにそのまま渡す。

### 3. カタログ詳細 API

Desktop が選択したカタログの詳細を取得し、ローカル接続作成画面に反映する API。

```http
GET /api/desktop/v1/catalogs/{catalogId}
```

認証: 必須

返すべき情報:

| フィールド               | 用途                                                  |
| ------------------------ | ----------------------------------------------------- |
| `transportType`          | `STDIO` / `SSE` / `STREAMABLE_HTTP`                   |
| `command`, `args`, `url` | 接続作成用テンプレート                                |
| `authType`               | `NONE` / `BEARER` / `API_KEY` / `OAUTH`               |
| `credentialKeys`         | Desktop で入力を促すキー                              |
| `tools`                  | ツール名、説明、初期許可状態                          |
| `status`                 | `available` / `request_required` / `disabled`         |
| `permissions`            | `{ read: boolean, write: boolean, execute: boolean }` |

理由:

Desktop ローカルの `McpCatalog` / `McpConnection` と、internal-manager 側のカタログ・許可ポリシーを同期するため。

### 4. 利用申請 API

ユーザーが Desktop から MCP 利用を申請する API。

```http
POST /api/desktop/v1/access-requests
```

認証: 必須

リクエスト:

```json
{
  "clientRequestId": "01HY0000000000000000000000",
  "catalogId": "github",
  "permissions": ["read", "execute"],
  "reason": "Repository investigation from Desktop"
}
```

`clientRequestId` は Desktop ローカル申請ごとに一度だけ生成し、再送時も同じ値を使う。

制約:

| フィールド        | 制約                                              |
| ----------------- | ------------------------------------------------- |
| `clientRequestId` | 必須。ULID または UUIDv7                          |
| `catalogId`       | 必須。Manager 側で登録された安定文字列 catalog ID |
| `permissions`     | 1 個以上。`read` / `write` / `execute` のいずれか |
| `reason`          | 必須。最大 1000 文字                              |

レスポンス:

```json
{
  "requestId": "clx0000000000000000000000",
  "status": "PENDING"
}
```

`requestId` は Manager が発行する opaque string として扱う。Desktop は形式を解釈せず、表示・問い合わせ・状態同期の識別子としてのみ使う。

対応するデータモデル候補:

- `IndividualPermission`
- `ApprovalStatus`

### 5. 申請状態同期 API

Desktop が申請中・承認済み・却下済みの状態を取得する API。

```http
GET /api/desktop/v1/access-requests?status=PENDING&limit=50&cursor=...
```

認証: 必須

返すべき情報:

| フィールド    | 用途                                            |
| ------------- | ----------------------------------------------- |
| `requestId`   | Desktop 側の状態更新                            |
| `catalogId`   | 対象 catalog                                    |
| `status`      | `PENDING` / `APPROVED` / `REJECTED` / `EXPIRED` |
| `permissions` | 承認された権限                                  |
| `expiresAt`   | 有効期限                                        |

理由:

管理画面で承認された後、Desktop が再起動なしで利用可能状態へ反映できるようにするため。

ページネーションは cursor-based とし、`limit` のデフォルトは 50、最大は 200 とする。

`cursor` は opaque な base64url 文字列とする。Desktop は中身を解釈せず、レスポンスで返された次ページ用 cursor を次リクエストにそのまま渡す。

`status` は任意フィルタとし、未指定の場合は全ステータスを返す。指定できる値は `PENDING` / `APPROVED` / `REJECTED` / `EXPIRED` とする。

### 6. ポリシー差分同期 API

Desktop が定期的に、権限・利用可能 MCP・機能フラグの変更を確認する API。

```http
GET /api/desktop/v1/policy-sync?since={policyVersion}
```

認証: 必須

返すべき情報:

| フィールド          | 用途                                 |
| ------------------- | ------------------------------------ |
| `policyVersion`     | 次回同期用                           |
| `changedCatalogs`   | 追加・更新された catalog             |
| `removedCatalogIds` | 利用不可になった catalog             |
| `permissions`       | ユーザーまたはグループ由来の最新権限 |

理由:

毎回フル同期せず、Desktop のローカル状態を軽く更新するため。

推奨ポーリング間隔は 5 分以上とする。サーバー側はユーザー単位で `1 request / minute` を目安に rate limit を設定し、短時間の連続同期を抑制する。実装は Redis など複数インスタンス間で共有できるストアを優先する。

### 7. 監査ログ検索 API

管理画面、または将来の Desktop 履歴同期で監査ログを検索する API。

```http
GET /api/desktop/v1/audit-logs?from=...&to=...&mcpServerId=...&limit=100&cursor=...
```

認証: 必須

用途:

- Desktop で送信済みログを確認する
- 管理画面の履歴を mock-data から実データに置き換える
- トラブルシュート時にローカル履歴とサーバー履歴を照合する

返すべき情報:

| フィールド   | 用途                         |
| ------------ | ---------------------------- |
| `items`      | 監査ログの配列               |
| `nextCursor` | 次ページ用 cursor            |
| `total`      | 総件数。高負荷な場合は省略可 |

ページネーションは cursor-based とし、`limit` のデフォルトは 100、最大は 500 とする。監査ログは時系列の確認・照合でまとまった件数を扱うため、通常一覧 API より上限を大きくする。

`cursor` は opaque な base64url 文字列とする。Desktop は中身を解釈せず、レスポンスで返された次ページ用 cursor を次リクエストにそのまま渡す。

## 監査ログ同期状態の設計

監査ログの「同期済みかどうか」は、Desktop ローカル DB 側で持つのがよい。Manager 側は受信済みログを保存するだけで、同期キューの状態は Desktop が管理する。

Desktop 側に追加する候補:

| フィールド            | 用途                              |
| --------------------- | --------------------------------- |
| `managerSyncStatus`   | `PENDING` / `SYNCED` / `FAILED`   |
| `managerSyncedAt`     | 最後に Manager へ送信成功した時刻 |
| `managerSyncAttempts` | 再送回数                          |
| `managerSyncError`    | 最後の失敗理由                    |
| `clientEventId`       | 冪等キー。再送時も同じ値を使う    |

`clientEventId` は Desktop ローカル監査ログごとに一度だけ生成する。形式は ULID または UUIDv7 とし、時系列ソートしやすい値を使う。

あわせて `POST /api/desktop/v1/audit-logs` は `clientEventId` を受け取り、per-log の結果を返す形にする。既存の `POST /api/internal/audit-logs` は互換 endpoint として残す。

```json
{
  "logs": [
    {
      "clientEventId": "01HX0000000000000000000000",
      "mcpServerId": "3",
      "toolName": "list_repos",
      "method": "tools/call",
      "httpStatus": 200,
      "durationMs": 342,
      "inputBytes": 50,
      "outputBytes": 1200,
      "occurredAt": "2026-05-03T10:00:00.000Z"
    }
  ]
}
```

レスポンス案:

```json
{
  "results": [
    {
      "clientEventId": "01HX0000000000000000000000",
      "status": "inserted",
      "auditLogId": "clx..."
    }
  ]
}
```

`status` は `inserted` / `duplicate` / `rejected` を想定する。Manager 側は `userId + clientEventId` の unique 制約を持てば、Desktop の再送による二重保存を避けられる。
重複時は HTTP 200 で `status: "duplicate"` を返し、エラー扱いにはしない。

`clientEventId` 対応後の `inserted` は、送信件数ではなく実際に DB へ新規挿入された件数を指す。重複分は `duplicate` として扱い、`inserted` には含めない。

## オフライン同期

Desktop はオフライン中も MCP 利用申請と監査ログをローカルに蓄積し、オンライン復帰後に再送する。

必須要件:

| 対象     | 方針                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| 監査ログ | ローカル DB に `PENDING` として保存し、Manager 送信成功後に `SYNCED` にする          |
| 利用申請 | ローカル DB に申請キューとして保存し、送信成功後に Manager の `requestId` を保持する |
| 再送     | アプリ起動時、ネットワーク復帰時、一定間隔のバックグラウンド同期で実行する           |
| 冪等性   | 監査ログは `clientEventId`、申請は `clientRequestId` を使う                          |
| 失敗時   | `FAILED` として失敗理由・試行回数を保存し、上限回数までは自動再送する                |

申請 API も再送を前提に `clientRequestId` を受け取る。

```json
{
  "clientRequestId": "01HY0000000000000000000000",
  "catalogId": "github",
  "permissions": ["read", "execute"],
  "reason": "Repository investigation from Desktop"
}
```

Manager 側は `userId + clientRequestId` の unique 制約を持ち、重複送信時は既存申請を返す。

`clientRequestId` は Desktop ローカル申請ごとに一度だけ生成する。形式は ULID または UUIDv7 とし、再送時は同じ値を使う。

エラー時の監査ログ例:

```json
{
  "clientEventId": "01HX0000000000000000000000",
  "mcpServerId": "3",
  "toolName": "create_issue",
  "method": "tools/call",
  "httpStatus": 500,
  "durationMs": 1200,
  "inputBytes": 812,
  "outputBytes": 0,
  "transportErrorCode": 500,
  "errorSummary": "Remote MCP server returned an error",
  "occurredAt": "2026-05-03T10:00:00.000Z"
}
```

`transportErrorCode` は MCP サーバーまたは HTTP transport が返した数値ステータスを保存する。Desktop API の標準エラー `error.code` とは別の値として扱う。既存の `POST /api/internal/audit-logs` では互換性のため `errorCode` を受け付け、Desktop API v1 では `transportErrorCode` に寄せる。

## エラー形式

Desktop API は HTTP endpoint として維持し、エラーレスポンスだけを安定フォーマットに統一する。

JSON-RPC 全面統一は採用しない。理由は、カタログ一覧・検索・差分同期のような取得系 API では HTTP method、status code、cache、query parameter を素直に使える方が実装と運用が単純なため。

標準エラー:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication is required.",
    "details": {
      "reason": "missing_bearer_token"
    }
  }
}
```

方針:

| 項目            | 方針                                              |
| --------------- | ------------------------------------------------- |
| HTTP status     | 認証・権限・validation・サーバー障害の分類に使う  |
| `error.code`    | Desktop 側の分岐に使う安定した string code        |
| `error.message` | 表示可能な短い説明                                |
| `error.details` | validation field errors、再送可能性、内部理由など |

JSON-RPC に寄せる場合でも、`POST /api/desktop/rpc` に集約するより、この形式で十分。MCP プロトコルそのものとは分離しておく。

標準エラーコード:

| code               | HTTP status | 意味                                         |
| ------------------ | ----------: | -------------------------------------------- |
| `UNAUTHORIZED`     |         401 | Bearer token なし、または不正                |
| `FORBIDDEN`        |         403 | 権限不足                                     |
| `NOT_FOUND`        |         404 | 対象リソースが存在しない                     |
| `VALIDATION_ERROR` |         400 | request body / query のスキーマ違反          |
| `RATE_LIMITED`     |         429 | レート制限超過。`Retry-After` ヘッダーを返す |
| `INTERNAL_ERROR`   |         500 | サーバー内部エラー                           |

`RATE_LIMITED` のレスポンス例:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json
```

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Retry later.",
    "details": {
      "retryAfterSecs": 60
    }
  }
}
```

## API 設計上の未決事項

| 項目         | 判断が必要な内容                                                               |
| ------------ | ------------------------------------------------------------------------------ |
| 認証情報配布 | Manager から secret を配布しない方針を維持するか、管理配布する場合の暗号化方式 |
| 再送上限     | 監査ログ・申請の自動再送を何回まで行うか                                       |
