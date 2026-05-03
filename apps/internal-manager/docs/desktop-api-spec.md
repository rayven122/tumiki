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

- Desktop 専用 client id は作らず、`OIDC_CLIENT_ID` を共用する。
- `OIDC_DESKTOP_CLIENT_ID` は現行 `apps/internal-manager` では使用されていない。
- 監査ログ API の JWT 検証は `issuer` と `sub` を見ているが、`audience` は未検証。

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

## 今後必要になる API

### 1. Desktop セッション API

Desktop がログイン直後に、ユーザー情報・権限・組織プロファイルをまとめて取得する API。

```http
GET /api/desktop/session
```

返すべき情報:

| フィールド      | 用途                             |
| --------------- | -------------------------------- |
| `user`          | Desktop の表示名、メール、role   |
| `groups`        | 所属グループと同期元             |
| `features`      | Desktop で有効にする機能フラグ   |
| `policyVersion` | 後続の差分同期・キャッシュ無効化 |

理由:

Desktop 側が「ログイン済みか」だけでなく、「このユーザーに何を見せるか」を判断できるようにするため。

### 2. 利用可能カタログ一覧 API

組織で利用可能、または申請可能な MCP カタログ一覧を返す API。

```http
GET /api/desktop/catalogs
```

返すべき情報:

| フィールド                       | 用途                                          |
| -------------------------------- | --------------------------------------------- |
| `id`                             | internal-manager 側の catalog ID              |
| `name`, `description`, `iconUrl` | Desktop の一覧表示                            |
| `status`                         | `available` / `request_required` / `disabled` |
| `permissions`                    | `read` / `write` / `execute` の許可状態       |
| `transportType`, `authType`      | Desktop 側の表示・絞り込み                    |
| `requiredCredentialKeys`         | Desktop で入力を促すキー                      |
| `tools`                          | 代表的なツール名・説明・許可状態              |

注意:

認証情報や API key は返さない。Desktop 側で入力させる値と、管理側が配布する値は分ける。

### 3. カタログ詳細 API

Desktop が選択したカタログの詳細を取得し、ローカル接続作成画面に反映する API。

```http
GET /api/desktop/catalogs/{catalogId}
```

返すべき情報:

| フィールド               | 用途                                    |
| ------------------------ | --------------------------------------- |
| `transportType`          | `STDIO` / `SSE` / `STREAMABLE_HTTP`     |
| `command`, `args`, `url` | 接続作成用テンプレート                  |
| `authType`               | `NONE` / `BEARER` / `API_KEY` / `OAUTH` |
| `credentialKeys`         | Desktop で入力を促すキー                |
| `tools`                  | ツール名、説明、初期許可状態            |

理由:

Desktop ローカルの `McpCatalog` / `McpConnection` と、internal-manager 側のカタログ・許可ポリシーを同期するため。

### 4. 利用申請 API

ユーザーが Desktop から MCP 利用を申請する API。

```http
POST /api/desktop/access-requests
```

リクエスト:

```json
{
  "catalogId": "github",
  "permissions": ["read", "execute"],
  "reason": "Repository investigation from Desktop"
}
```

レスポンス:

```json
{
  "requestId": "req_123",
  "status": "PENDING"
}
```

対応するデータモデル候補:

- `IndividualPermission`
- `ApprovalStatus`

### 5. 申請状態同期 API

Desktop が申請中・承認済み・却下済みの状態を取得する API。

```http
GET /api/desktop/access-requests
```

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

### 6. ポリシー差分同期 API

Desktop が定期的に、権限・利用可能 MCP・機能フラグの変更を確認する API。

```http
GET /api/desktop/policy-sync?since={policyVersion}
```

返すべき情報:

| フィールド          | 用途                                 |
| ------------------- | ------------------------------------ |
| `policyVersion`     | 次回同期用                           |
| `changedCatalogs`   | 追加・更新された catalog             |
| `removedCatalogIds` | 利用不可になった catalog             |
| `permissions`       | ユーザーまたはグループ由来の最新権限 |

理由:

毎回フル同期せず、Desktop のローカル状態を軽く更新するため。

### 7. 監査ログ検索 API

管理画面、または将来の Desktop 履歴同期で監査ログを検索する API。

```http
GET /api/desktop/audit-logs?from=...&to=...&mcpServerId=...
```

用途:

- Desktop で送信済みログを確認する
- 管理画面の履歴を mock-data から実データに置き換える
- トラブルシュート時にローカル履歴とサーバー履歴を照合する

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

あわせて `POST /api/internal/audit-logs` は将来的に `clientEventId` を受け取り、per-log の結果を返す形に変える。

```json
{
  "logs": [
    {
      "clientEventId": "desktop-log-01HX...",
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
      "clientEventId": "desktop-log-01HX...",
      "status": "inserted",
      "auditLogId": "clx..."
    }
  ]
}
```

`status` は `inserted` / `duplicate` / `rejected` を想定する。Manager 側は `userId + clientEventId` の unique 制約を持てば、Desktop の再送による二重保存を避けられる。

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
  "clientRequestId": "desktop-request-01HY...",
  "catalogId": "github",
  "permissions": ["read", "execute"],
  "reason": "Repository investigation from Desktop"
}
```

Manager 側は `userId + clientRequestId` の unique 制約を持ち、重複送信時は既存申請を返す。

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

## API 設計上の未決事項

| 項目                | 判断が必要な内容                                                               |
| ------------------- | ------------------------------------------------------------------------------ |
| JWT audience 検証   | `aud` を必須にする場合、`verifyDesktopJwt()` の検証条件を追加する              |
| 冪等キーの形式      | `clientEventId` / `clientRequestId` の生成方式と保存場所                       |
| catalog ID の発行元 | Desktop local DB の catalog ID と internal-manager 側 catalog ID の対応方法    |
| 認証情報配布        | Manager から secret を配布しない方針を維持するか、管理配布する場合の暗号化方式 |
| 再送上限            | 監査ログ・申請の自動再送を何回まで行うか                                       |
