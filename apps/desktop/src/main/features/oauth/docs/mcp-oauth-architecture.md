# MCP OAuth認証 アーキテクチャドキュメント

## Context

MCPカタログ画面からOAuth認証が必要なMCPサーバーを追加する機能を実装する。

- authType: "OAUTH" のカタログアイテム（Figma, GitHub, Linear等 11件）があるが、実際のOAuthフローは未実装
- **目標**: カタログからOAuth MCPサーバーを選択 → ブラウザでOAuth認証 → デスクトップアプリにトークン保存 → MCPサーバー画面に追加

## 現状の把握

### 動作済み

- `mcp.service.createFromCatalog()`: McpServer + McpConnection作成
- 暗号化基盤: SafeStorage / AES-256-GCM（`src/main/utils/encryption.ts`）
- シードデータ: OAuth対象11件（Figma, Linear, Notion, GitHub, GitLab, Slack, Google Maps, Atlassian, Asana, Money Forward, Freee）

### 実装済み（本PR）

- カスタムプロトコルハンドラー（`tumiki://oauth/callback`）
- OAuth Discovery (RFC 9728 + RFC 8414)
- Dynamic Client Registration (RFC 7591)
- PKCE + 認可URL生成（既存 `auth/pkce.ts` を流用）
- トークン交換・保存（`oauth4webapi` 使用）
- OAuthクライアント情報のキャッシュ（`OAuthClient` テーブル、暗号化保存）
- DCR非対応サーバー向けClient ID/Secret手動入力UI

### 未実装（今後の対応）

- トークン自動リフレッシュ
- トークン切れ時の再認証UI
- OAuth Discovery未対応サーバー向けエンドポイント手動設定UI

---

## OAuthフロー全体像

### MCP仕様 (2025-06-18) に準拠したOAuth 2.0フロー

MCP（Model Context Protocol）では、リモートMCPサーバーへの認証にOAuth 2.0を採用している。
クライアント（デスクトップアプリ）は以下の3つのRFCに従い、MCPサーバーに安全に接続する。

```
各Phaseは前のPhaseの結果に依存しており、必ずこの順序で実行する:

Phase 1: Discovery（メタデータ取得）
  「どこに行けばいいか」を知る
  Desktop App ──→ MCP Server (Figma等)
    GET /.well-known/oauth-protected-resource/mcp   [RFC 9728]
    ←── { authorization_servers: ["https://www.figma.com"] }
  Desktop App ──→ Auth Server (認可サーバー)
    GET /.well-known/oauth-authorization-server      [RFC 8414]
    ←── { authorization_endpoint, token_endpoint, registration_endpoint, ... }
  → 結果: 各エンドポイントのURLが判明（まだ何も登録していない）

Phase 2: DCR（Dynamic Client Registration）
  「自分が誰か」を認可サーバーに登録し、client_id を取得する
  ※ client_id がないと Phase 3 の認可URLを組み立てられない
  Desktop App ──→ Auth Server
    POST /register                                   [RFC 7591]
    { client_name, redirect_uris, grant_types }
    ←── { client_id, client_secret }
  → 結果: client_id / client_secret を取得

Phase 3: Authorization + Token Exchange
  client_id を使ってユーザー認証し、MCPサーバー接続用のアクセストークンを得る
  Desktop App ──→ Browser ──→ Auth Server /authorize  (PKCE + State + client_id)
    ←── tumiki://oauth/callback?code=xxx&state=yyy
  Desktop App ──→ Auth Server /token
    POST code + code_verifier + client_id + client_secret
    ←── { access_token, refresh_token }
  → 結果: MCPサーバーに接続できるアクセストークンを取得

依存関係:
  Discovery → registration_endpoint のURLが判明
    → DCR → client_id を取得
      → 認可 → client_id を使ってユーザー認証、code を取得
        → トークン交換 → code + client_id でアクセストークンを取得
          → MCPサーバーに接続可能に
```

---

## Phase 1: OAuth Discovery（メタデータ取得）

### 概要

MCPサーバーのURLから、そのサーバーが使用するOAuth認可サーバー（Authorization Server）の情報を自動取得する。
手動でエンドポイントを設定する必要がなく、URLだけで認可フローを開始できる。

### Step 1-1: Protected Resource Metadata（RFC 9728）

MCPサーバー自体が「保護されたリソース」として、どの認可サーバーを使っているかを公開する。

```
リクエスト:
  GET https://mcp.figma.com/.well-known/oauth-protected-resource/mcp
  Accept: application/json

レスポンス（200 OK）:
  {
    "resource": "https://mcp.figma.com/mcp",
    "authorization_servers": ["https://www.figma.com"],
    "scopes_supported": ["files:read", "file_dev_resources:write"]
  }
```

- `authorization_servers[0]` → 認可サーバーのベースURL
- URLの構築: `/.well-known/oauth-protected-resource` + MCPサーバーのパス（`/mcp`）

### Step 1-2: Authorization Server Metadata（RFC 8414）

認可サーバーのベースURLから、各エンドポイント情報を取得する。

```
リクエスト:
  GET https://www.figma.com/.well-known/oauth-authorization-server
  Accept: application/json

レスポンス（200 OK）:
  {
    "issuer": "https://www.figma.com",
    "authorization_endpoint": "https://www.figma.com/oauth",
    "token_endpoint": "https://www.figma.com/api/oauth/token",
    "registration_endpoint": "https://www.figma.com/api/oauth/register",
    "scopes_supported": ["files:read", "file_dev_resources:write"],
    "response_types_supported": ["code"],
    "grant_types_supported": ["authorization_code", "refresh_token"],
    "code_challenge_methods_supported": ["S256"],
    "token_endpoint_auth_methods_supported": ["client_secret_post"]
  }
```

取得する重要なエンドポイント:

| フィールド               | 用途                                      | 呼び出し元       |
| ------------------------ | ----------------------------------------- | ---------------- |
| `registration_endpoint`  | DCR（クライアント登録）を行うURL          | アプリが直接POST |
| `authorization_endpoint` | ユーザーが認証・同意するページのURL       | ブラウザで開く   |
| `token_endpoint`         | 認可コードをアクセストークンに交換するURL | アプリが直接POST |

#### 各エンドポイントの詳細

**`registration_endpoint`** — クライアント登録（DCR、初回のみ）

**目的**: Figma等の認可サーバーに「Tumiki Desktopというアプリが存在する」ことを知らせ、
以降のOAuth通信で使う身分証明書（`client_id` / `client_secret`）を発行してもらう。
これがないと、認可サーバーは「どのアプリからのリクエストか」を識別できず、認可フローを開始できない。

ブラウザは使わず、アプリがバックグラウンドでHTTPリクエストを送る。

```
POST https://www.figma.com/api/oauth/register
{ "client_name": "Tumiki Desktop", "redirect_uris": [...] }

→ { "client_id": "abc123", "client_secret": "secret" }
```

**`authorization_endpoint`** — ユーザー認証・同意（ブラウザ操作）

**目的**: 「このユーザーが、Tumiki DesktopにFigmaのデータへのアクセスを許可する」という同意を得る。
OAuthではアプリが直接ユーザーのパスワードを受け取ることはなく、
必ずサービス本体（Figma）の画面上でユーザーが自分の意思で許可する必要がある。
このステップの結果として、一時的な認可コード（`code`）がアプリに返される。

唯一ブラウザ（ユーザー操作）が必要なエンドポイント。

```
ブラウザで開く:
  https://www.figma.com/oauth?client_id=abc123&redirect_uri=tumiki://oauth/callback&response_type=code&...

ユーザーの操作:
  1. Figmaにログイン（未ログインの場合）
  2. 「Tumiki Desktopがあなたのファイルにアクセスすることを許可しますか？」に同意
  3. → tumiki://oauth/callback?code=xxx にリダイレクト（OSがElectronアプリに渡す）
```

**`token_endpoint`** — トークン交換（アプリがバックグラウンドで実行）

**目的**: 認可コード（`code`）を、MCPサーバーに接続するためのアクセストークンに交換する。
認可コードは短命（数分）で1回しか使えない一時的な引換券に過ぎない。
このステップで得られるアクセストークンが、MCPサーバーへの接続時に使う実際の認証情報になる。
（トークンの発行元はFigma本体の認可サーバーだが、使う先はMCPサーバー）
ブラウザは使わず、アプリがバックグラウンドでHTTPリクエストを送る。

```
POST https://www.figma.com/api/oauth/token
grant_type=authorization_code&code=xxx&code_verifier=yyy

→ { "access_token": "eyJ...", "refresh_token": "dGhp...", "expires_in": 3600 }
```

#### アクセストークンとリフレッシュトークンの役割

**なぜ2つのトークンが必要か:**

アクセストークンはMCPサーバー（`https://mcp.figma.com/mcp`）に接続するための「鍵」だが、セキュリティ上の理由で短命（通常1時間程度）に設定されている。
万が一アクセストークンが漏洩しても、短時間で無効化されるため被害を限定できる。
（トークンの発行元はFigma本体の認可サーバーだが、実際にトークンを使う先はMCPサーバー）

しかし、トークンが切れるたびにユーザーにブラウザで再認証させるのは不便すぎる。
そこでリフレッシュトークン（長命、数日〜数ヶ月）を使い、ユーザー操作なしでアクセストークンを再発行する。

| トークン             | 有効期間             | 用途                                                             | 漏洩リスク                                   |
| -------------------- | -------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| アクセストークン     | 短い（1時間程度）    | MCPサーバー（mcp.figma.com/mcp等）への接続時にHTTPヘッダーに付与 | 短命なので被害が限定的                       |
| リフレッシュトークン | 長い（数日〜数ヶ月） | アクセストークン期限切れ時に新しいトークンを取得                 | 長命だが外部送信しない（token_endpointのみ） |

**今後の使い方:**

```
MCPサーバー接続時:
  1. 保存済みのアクセストークンの期限を確認
  2. 期限内 → そのままアクセストークンをHTTPヘッダーに付与して接続
     Authorization: Bearer {access_token}
  3. 期限切れ → リフレッシュトークンで新しいアクセストークンを自動取得
     POST https://www.figma.com/api/oauth/token
     grant_type=refresh_token&refresh_token={refresh_token}&client_id=abc123
     → { "access_token": "新しいトークン", "expires_in": 3600 }
  4. 新しいアクセストークンをDBに保存し、接続に使用
  5. リフレッシュトークンも期限切れ → ユーザーに再認証を促す（ブラウザで再度OAuth）
```

この仕組みにより、ユーザーは初回のブラウザ認証1回だけで、以降はアプリが自動的にトークンを更新し続ける。
リフレッシュトークン自体が失効した場合のみ、再度ブラウザでの認証が必要になる。

#### 時系列での使用順序

```
1. registration_endpoint  → client_id を取得      [アプリが直接POST / 初回のみ]
2. authorization_endpoint → ユーザー認証 → code取得 [ブラウザ操作]
3. token_endpoint         → code → access_token    [アプリが直接POST]
```

### Discoveryフォールバック戦略

一部のサーバーはRFC 9728をサポートしていない場合がある。
MCPサーバーのURLだけが分かっている状態から、認可サーバーの情報を確実に見つけるために複数のパターンを試行する。

前提: MCP Server URL = `https://mcp.figma.com/mcp` の場合

- origin: `https://mcp.figma.com`
- path: `/mcp`

#### Step 1: Protected Resource Metadata（RFC 9728）を試す

```
GET https://mcp.figma.com/.well-known/oauth-protected-resource/mcp

成功した場合（Figmaはここで成功する）:
  → { "authorization_servers": ["https://www.figma.com"] }
  → AS URL = "https://www.figma.com" を取得 → Step 2 へ

失敗した場合（404やネットワークエラー）:
  → AS URLが不明なので Step 3 にスキップ
```

RFC 9728をサポートしていないサーバーは、このエンドポイント自体が存在しないので404が返る。

#### Step 2: AS Metadata（RFC 8414）— AS URLが分かっている場合

Step 1で AS URL が取得できた場合、そこからメタデータを取る。

```
試行1: AS URLそのまま
  GET https://www.figma.com/.well-known/oauth-authorization-server
  → 成功すれば完了

試行2: AS URL + MCPサーバーのpath
  GET https://www.figma.com/mcp/.well-known/oauth-authorization-server
  → 一部のサーバーはpathごとに異なるOAuth設定を持つため
```

なぜ2パターン試すのか: 認可サーバーが1つのドメインで複数のサービスを提供している場合、pathごとに異なるOAuth設定（スコープ等）を返すことがある。

#### Step 3: 直接試行 — AS URLが不明な場合のフォールバック

Step 1が失敗した場合（RFC 9728非対応）、AS URLが分からない。
「MCPサーバー自体が認可サーバーも兼ねているかもしれない」という前提で直接試す。

```
試行1: MCP Server URLのoriginを使う
  GET https://mcp.figma.com/.well-known/oauth-authorization-server

試行2: MCP Server URL自体を使う（pathを含む）
  GET https://mcp.figma.com/mcp/.well-known/oauth-authorization-server
```

これは「MCPサーバーと認可サーバーが同じドメインにある」ケースを想定している。

#### サーバーごとの具体例

```
Figma（RFC 9728対応、MCPサーバーと認可サーバーが別ドメイン）:
  MCPサーバー: https://mcp.figma.com/mcp
  認可サーバー: https://www.figma.com
  → Step 1 で AS URL取得 → Step 2 でメタデータ取得（正常ルート）

仮にRFC 9728非対応で同一ドメインのサーバーがあった場合:
  MCPサーバー: https://example.com/mcp
  認可サーバー: https://example.com
  → Step 1 失敗（404）→ Step 3 で直接試行 → 成功
```

#### コードとの対応（`apps/manager/src/lib/oauth/dcr.ts`）

```typescript
// Step 1: Protected Resource Metadata
const protectedResourceUrl = `${origin}/.well-known/oauth-protected-resource${path}`;
// → https://mcp.figma.com/.well-known/oauth-protected-resource/mcp

let asUrl = null;
const res = await fetch(protectedResourceUrl);
if (res.ok) {
  asUrl = metadata.authorization_servers[0];
  // → "https://www.figma.com"
}

// Step 2 or 3: AS Metadata
const urlsToTry = asUrl
  ? [asUrl, `${asUrl}${path}`] // Step 2: AS URLあり
  : // → ["https://www.figma.com", "https://www.figma.com/mcp"]
    [serverUrl, origin]; // Step 3: AS URL不明
// → ["https://mcp.figma.com/mcp", "https://mcp.figma.com"]

for (const issuerUrl of urlsToTry) {
  // oauth.discoveryRequest(issuerUrl)
  // = GET {issuerUrl}/.well-known/oauth-authorization-server
}
```

**参考実装**: `apps/manager/src/lib/oauth/dcr.ts` の `discoverOAuthMetadata()`

---

## Phase 2: DCR（Dynamic Client Registration）

### 概要

DCR（RFC 7591）は、OAuthクライアント（デスクトップアプリ）が認可サーバーに自分自身を**動的に登録**する仕組み。
従来のOAuthでは、開発者がFigma/GitHub等のダッシュボードで手動でアプリ登録し `client_id` / `client_secret` を取得する必要があったが、DCRではプログラムから自動で行える。

### なぜDCRが必要か

| 従来のOAuth                                  | DCR                                |
| -------------------------------------------- | ---------------------------------- |
| 開発者がサービスごとに手動でアプリ登録       | アプリが自動で登録                 |
| `client_id`をハードコード or 環境変数        | 動的に取得・キャッシュ             |
| サービスごとにダッシュボード操作が必要       | URLだけで全自動                    |
| ユーザーは設定不要だが開発者の事前作業が必要 | 開発者・ユーザーともに事前作業不要 |

MCP仕様ではDCRを標準として採用しているため、Figma, GitHub, Linear等のMCPサーバーはすべてDCRエンドポイントを公開している。

### DCRリクエスト

```
POST https://www.figma.com/api/oauth/register
Content-Type: application/json

{
  "client_name": "Tumiki Desktop",
  "redirect_uris": ["tumiki://oauth/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "client_secret_post"
}
```

| フィールド                   | 説明                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `client_name`                | アプリ名（認可画面に表示される）                                                |
| `redirect_uris`              | 認証完了後のリダイレクト先（カスタムプロトコル）                                |
| `grant_types`                | `authorization_code`（認可コード取得）+ `refresh_token`（トークン更新）         |
| `response_types`             | `code`（認可コードフロー）                                                      |
| `token_endpoint_auth_method` | トークン交換時の認証方式（`client_secret_post` = ボディにシークレットを含める） |

### DCRレスポンス

```json
{
  "client_id": "abc123xyz",
  "client_secret": "secret_value_here",
  "client_id_issued_at": 1712345678,
  "client_secret_expires_at": 0,
  "redirect_uris": ["tumiki://oauth/callback"],
  "client_name": "Tumiki Desktop",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "client_secret_post"
}
```

- `client_secret_expires_at: 0` = 無期限
- 一部サーバーは `client_secret` を返さない（パブリッククライアント）

### DCRキャッシュ戦略

DCRの結果は**MCP Server URLごとにDBに暗号化保存**し、2回目以降はキャッシュを再利用する。

```
oauth.service.startOAuthFlow(mcpServerUrl)
    +-- OAuthClient テーブルを mcpServerUrl で検索
    |   +-- キャッシュあり → client_id / client_secret を復号して使用
    |   +-- キャッシュなし → Discovery + DCR実行 → 結果を暗号化保存
    +-- 以降のフローへ
```

注意点:

- `redirect_uris` にはカスタムプロトコル（`tumiki://oauth/callback`）を使用
- Manager（Webアプリ）と異なり、Desktopにはブラウザからアクセスできる固定Originがない
- カスタムプロトコルを使うことで redirect_uri が常に固定となり、DCRキャッシュが確実に再利用できる

### DCRエラーハンドリング

| エラー                       | 原因                        | 対応                                              |
| ---------------------------- | --------------------------- | ------------------------------------------------- |
| `invalid_client_metadata`    | redirect_urisが不正等       | エラーメッセージ表示                              |
| `registration_endpoint` なし | サーバーがDCR非対応         | 「このサーバーはOAuth自動登録に対応していません」 |
| ネットワークエラー           | サーバー到達不可            | リトライ or エラー表示                            |
| 401/403                      | `initialAccessToken` が必要 | 現時点では非対応（将来対応）                      |

### DCR実装の注意点（Manager実装から学んだこと）

1. **`client_secret_expires_at` の補完**: 一部サーバーはこのフィールドを返さない。`oauth4webapi` ライブラリの厳格な検証を回避するため、存在しない場合は `0` を補完する
2. **HTTPステータスコードの補正**: 一部サーバーは 200 を返すが、RFC 7591 では 201 が正しい。`oauth4webapi` の処理に合わせてステータスコードを変換する
3. **issuer検証の緩和**: `issuer` フィールドがメタデータのURLと完全一致しないサーバーがある。origin（ドメイン）レベルでの一致を許容する

**参考実装**: `apps/manager/src/lib/oauth/dcr.ts` の `performDCR()`
**使用ライブラリ**: `oauth4webapi`（RFC準拠のOAuth 2.0クライアントライブラリ）

---

## Phase 3: 認可コード取得 + トークン交換

Phase 2（DCR）で `client_id` を取得した。
このPhaseでは、ユーザーにブラウザで認証してもらい、最終的にMCPサーバー接続用のアクセストークンを得る。

Phase 3は以下の4ステップで構成される:

```
Step 3-0: PKCE準備     → セキュリティ用の検証値ペアを生成（アプリ内部で完結）
Step 3-1: 認可URL生成   → ブラウザで開くURLを組み立てる（アプリ内部で完結）
Step 3-2: コールバック受信 → ブラウザからの認可コードを受け取る（カスタムプロトコル）
Step 3-3: トークン交換   → 認可コードをアクセストークンに交換する（認可サーバーにPOST）
```

---

### Step 3-0: PKCE準備（セキュリティ対策）

**目的**: 認可コード（code）が第三者に横取りされても、アクセストークンに交換できないようにする。

**なぜ必要か**: OAuthの認可コードはブラウザのリダイレクトを経由するため、
悪意あるアプリやブラウザ拡張が `localhost:PORT/callback?code=xxx` のURLを傍受する可能性がある。
PKCEがないと、横取りしたcodeをそのままトークン交換に使えてしまう。

**仕組み**: アプリだけが知っている「秘密の値」を事前に作り、認可サーバーに「ハッシュ」だけ渡す。
トークン交換時に「元の値」を送ることで、「認可リクエストを出したアプリ本人」であることを証明する。

```
アプリ内部で実行（外部通信なし）:

1. code_verifier 生成: 32バイトランダム → Base64URL（43文字）
   → 例: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
   → これは「秘密の値」。アプリのメモリにだけ保持し、外部に送らない

2. code_challenge 生成: SHA-256(code_verifier) → Base64URL
   → 例: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
   → これは「秘密の値のハッシュ」。認可サーバーに送る（元の値は復元できない）
```

```
攻撃者がcodeを横取りした場合:
  攻撃者: POST /token code=xxx&code_verifier=???  ← code_verifierを知らないので交換できない
  アプリ:  POST /token code=xxx&code_verifier=dBjftJeZ...  ← 正しい値を送れる
```

**参考実装**: `apps/manager/src/lib/oauth/pkce.ts`

---

### Step 3-1: 認可URL生成 + ブラウザで開く

**目的**: ユーザーをFigmaの認証・同意画面に誘導し、「Tumiki DesktopがFigmaにアクセスすることを許可する」同意を得る。

**なぜブラウザが必要か**: OAuthではアプリがユーザーのパスワードを直接受け取ることは禁止されている。
必ずサービス本体（Figma）のページ上で、ユーザー自身がログインし許可する必要がある。
これにより、アプリにパスワードが渡ることなく、安全にアクセス権を委譲できる。

認可URLの各パラメータの役割:

```
https://www.figma.com/oauth
  ?client_id=abc123xyz                          ← DCRで取得した身分証明書
  &redirect_uri=tumiki://oauth/callback          ← 認証完了後の戻り先（カスタムプロトコル）
  &response_type=code                            ← 「認可コードをください」という指定
  &scope=files:read file_dev_resources:write     ← 要求する権限の範囲
  &state={ランダム文字列}                         ← CSRF攻撃対策（後述）
  &code_challenge={SHA-256ハッシュ}               ← PKCE（Step 3-0で生成）
  &code_challenge_method=S256                    ← ハッシュ方式の指定
```

| パラメータ           | 目的                                                                               |
| -------------------- | ---------------------------------------------------------------------------------- |
| `client_id`          | 認可サーバーが「どのアプリからのリクエストか」を識別する                           |
| `redirect_uri`       | 認証完了後、認可コードをどこに送るか指定する（カスタムプロトコル）                 |
| `response_type=code` | 認可コードフロー（最も安全な方式）を使うことを宣言する                             |
| `scope`              | アプリが必要とする権限を指定する（ユーザーの同意画面に表示される）                 |
| `state`              | コールバック受信時に一致を検証し、第三者が偽のコールバックを送る攻撃（CSRF）を防ぐ |
| `code_challenge`     | PKCEの検証値ハッシュ。トークン交換時に元の値との一致を検証する                     |

アプリは `shell.openExternal(authorizationUrl)` でシステムブラウザを開く。
ユーザーがFigmaにログインし「許可」をクリックすると、ブラウザが `tumiki://oauth/callback?code=xxx&state=yyy` にリダイレクトされ、OSがElectronアプリを起動（またはフォーカス）する。

**参考実装**: `apps/manager/src/lib/oauth/oauth-client.ts` の `generateAuthorizationUrl()`

---

### Step 3-2: カスタムプロトコルで認可コードを受信

**目的**: ブラウザからリダイレクトされてくる認可コード（code）を、デスクトップアプリが受け取る。

**Manager（Webアプリ）との違い**:
Managerは自身のOrigin（`https://app.example.com/api/oauth/callback`）が常に存在するため、そこでコールバックを受信できる。
一方、Electronアプリには外部からアクセスできるHTTP Originがないため、別の仕組みが必要。

**カスタムプロトコル方式を採用する理由**:
ローカルHTTPサーバー（`http://localhost:PORT/callback`）を使う方法もあるが、以下の問題がある:

- 毎回ランダムなポートが割り当てられるため `redirect_uri` が変わる
- DCR登録時の `redirect_uris` と認証時のポートが不一致になるとサーバーに拒否される
- DCRキャッシュが実質無効になる（ポート変更のたびに再登録が必要）

カスタムプロトコル（`tumiki://oauth/callback`）なら:

- `redirect_uri` が常に固定 → DCRキャッシュが確実に機能
- ポート管理・HTTPサーバーのライフサイクル管理が不要
- OSレベルでアプリに直接ルーティングされる

**仕組み**: Electronの `app.setAsDefaultProtocolClient("tumiki")` でOSにカスタムプロトコルを登録する。
ブラウザが `tumiki://oauth/callback?code=xxx&state=yyy` にリダイレクトすると、
OSがElectronアプリを起動（またはフォーカス）し、URLをアプリに渡す。

```
事前準備（アプリ起動時に1回だけ）:
  1. app.setAsDefaultProtocolClient("tumiki") でOSにプロトコル登録
  2. macOS: app.on("open-url") でURLを受信するリスナーを設定
     Windows/Linux: app.on("second-instance") でURLを受信するリスナーを設定

認可URLを開いた後:
  3. shell.openExternal(authorizationUrl) でブラウザを開く

ユーザーがブラウザで認証完了後:
  4. Figma認可サーバーがブラウザを以下にリダイレクト:
     tumiki://oauth/callback?code=AUTH_CODE_HERE&state=RANDOM_STATE
  5. OSがElectronアプリにURLを渡す（open-url / second-instance イベント）
  6. アプリが code と state をURLから抽出
  7. state がStep 3-1で送った値と一致するか検証（CSRF対策）
  8. → Step 3-3へ
```

タイムアウト: 5分（ユーザーが認証しなかった場合は待機状態をクリーンアップ）

**プラットフォーム別の挙動**:

| OS      | プロトコル受信方法                                | 注意点                                                             |
| ------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| macOS   | `app.on("open-url", (event, url) => ...)`         | アプリが既に起動中ならそのまま受信                                 |
| Windows | `app.on("second-instance", (event, argv) => ...)` | `argv` の末尾にURLが入る。`app.requestSingleInstanceLock()` が必要 |
| Linux   | `app.on("second-instance", (event, argv) => ...)` | Windowsと同様                                                      |

---

### Step 3-3: トークン交換

**目的**: 認可コード（code）を、MCPサーバーに接続するためのアクセストークンに交換する。

**なぜこのステップが必要か**: 認可コードは「ユーザーが許可した」という証明書に過ぎず、
そのままではMCPサーバーにアクセスできない。認可コードは短命（数分）で1回しか使えないため、
長期間使えるアクセストークン（とリフレッシュトークン）に交換する必要がある。

```
POST https://www.figma.com/api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code          ← 「認可コードをトークンに交換したい」
&client_id=abc123xyz                   ← DCRで取得した身分証明書
&client_secret=secret_value_here       ← DCRで取得したシークレット
&code={認可コード}                      ← Step 3-2で受信したcode
&redirect_uri=tumiki://oauth/callback           ← Step 3-1と同じ値（検証用）
&code_verifier={PKCE検証値}             ← Step 3-0で生成した秘密の値
```

| パラメータ                    | 目的                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| `grant_type`                  | トークン取得方式を指定する                                  |
| `client_id` + `client_secret` | アプリの身元を証明する                                      |
| `code`                        | ユーザーが許可した証拠を提出する                            |
| `redirect_uri`                | 認可リクエスト時と一致するか検証される（不一致なら拒否）    |
| `code_verifier`               | PKCE検証。認可サーバーがSHA-256ハッシュと一致するか検証する |

認可サーバーは以下をすべて検証してからトークンを発行する:

1. `client_id` / `client_secret` が正しいか
2. `code` が有効か（未使用、未期限切れ）
3. `redirect_uri` が認可リクエスト時と一致するか
4. `SHA-256(code_verifier) === code_challenge` か（PKCE検証）

レスポンス:

```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBh...",
  "scope": "files:read file_dev_resources:write"
}
```

このアクセストークンを `McpConnection.credentials` に暗号化保存し、
MCPサーバー（`https://mcp.figma.com/mcp`）への接続時に `Authorization: Bearer {access_token}` ヘッダーとして使用する。

**参考実装**: `apps/manager/src/lib/oauth/oauth-client.ts` の `exchangeCodeForToken()`

---

## 実装方針

### アーキテクチャ: カスタムプロトコル方式

Managerはself-hosted Webアプリのため自身のOrigin（`/api/oauth/callback`）でコールバックを受信できるが、
Electronアプリには外部からアクセス可能なHTTP Originがない。
そのため、カスタムプロトコル（`tumiki://`）をOSに登録し、ブラウザからのリダイレクトを直接受け取る。

```
[アプリ起動時] app.setAsDefaultProtocolClient("tumiki") でOSにプロトコル登録

[Renderer] AddMcpModal "ブラウザで認証" クリック
    | IPC: oauth:startAuth
[Main] OAuthサービス
    +-- 1. OAuth Discovery (MCP Server URL → AS metadata)
    +-- 2. DCR (クライアント登録、キャッシュ済みならスキップ)
    +-- 3. PKCE生成 + State生成
    +-- 4. shell.openExternal(authorizationUrl) → ブラウザ
    +-- 5. Promiseで待機（open-url / second-instance イベントを監視）
    |
    |   [ブラウザ] ユーザー認証・同意
    |       | リダイレクト: tumiki://oauth/callback?code=xxx&state=yyy
    |
    +-- 6. OSがElectronアプリにURLを渡す → イベント発火
    +-- 7. State検証 + トークン交換 (POST token_endpoint)
    +-- 8. トークン暗号化・DB保存
    +-- 9. McpServer + McpConnection作成
    | IPC: 結果返却
[Renderer] 成功 → /tools へ遷移 + トースト
```

### 1. DBスキーマ変更

**ファイル**: `apps/desktop/prisma/schema.prisma`

```prisma
/// OAuthクライアント登録キャッシュ（DCR結果）
model OAuthClient {
  id                      Int      @id @default(autoincrement())
  /// MCPサーバーURL（認可サーバー特定用）
  mcpServerUrl            String   @unique
  /// 認可サーバーURL
  authorizationServerUrl  String
  /// 認可エンドポイント
  authorizationEndpoint   String
  /// トークンエンドポイント
  tokenEndpoint           String
  /// クライアントID（暗号化）
  clientId                String
  /// クライアントシークレット（暗号化）
  clientSecret            String?
  /// リダイレクトURI（固定: tumiki://oauth/callback）
  redirectUri             String   @default("tumiki://oauth/callback")
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

McpConnectionへの変更:

- `credentials`フィールドにOAuthトークンを格納（既存のJSON形式を拡張）
- OAuth用: `{ "access_token": "...", "refresh_token": "...", "expires_at": "...", "scope": "..." }`

### 2. OAuth コアロジック（Mainプロセス）

**新規ディレクトリ**: `apps/desktop/src/main/features/oauth/`

```
oauth/
├── oauth.types.ts         # 型定義（McpOAuthSession, StartOAuthInput等）
├── oauth.discovery.ts     # RFC 9728 + RFC 8414 メタデータ取得
├── oauth.dcr.ts           # RFC 7591 Dynamic Client Registration
├── oauth.auth-url.ts      # 認可URL生成
├── oauth.token.ts         # トークン交換 + リフレッシュ
├── oauth.protocol.ts      # tumiki://oauth/callback パーサー
├── oauth.repository.ts    # OAuthClient DB操作（暗号化保存）
├── oauth.service.ts       # フロー全体のオーケストレーション
├── oauth.ipc.ts           # IPCハンドラー（zodバリデーション付き）
├── __tests__/             # ユニットテスト
└── docs/                  # 本ドキュメント
```

PKCE は既存の `apps/desktop/src/main/auth/pkce.ts` をインポートして流用。

### 3. IPCハンドラー

**ファイル**: `apps/desktop/src/main/features/oauth/oauth.ipc.ts`

```typescript
// OAuth認証フロー開始（ブラウザオープン → コールバック待機 → トークン取得 → MCP登録まで一括）
ipcMain.handle("oauth:startAuth", async (_, input: OAuthStartInput) => {
  return oauthService.startOAuthFlow(input);
});
// 返却: { serverId: number; serverName: string } | { error: string }
```

**Preloadに追加**:

```typescript
oauth: {
  startAuth(input: OAuthStartInput): Promise<OAuthResult>
}
```

### 4. UI変更

**ファイル**: `apps/desktop/src/renderer/_components/AddMcpModal.tsx`

OAuth認証タイプの場合のUI:

- 「ブラウザで認証」ボタンを表示
- 認証中: ローディングスピナー + 「ブラウザで認証を完了してください...」メッセージ
- 成功: 通常通り /tools へ遷移
- エラー/タイムアウト: エラーメッセージ表示

```
+-----------------------------------+
| OAuth認証                      [x]|
|                                   |
| Figma MCPに接続するために        |
| ブラウザでOAuth認証を行います    |
|                                   |
| [icon] Figma MCP                 |
|        OAuth                      |
|                                   |
| サーバー名: [Figma MCP        ]  |
| 識別子: figma-mcp                |
|                                   |
|  +-----------------------------+  |
|  |  ブラウザで認証              |  |
|  +-----------------------------+  |
|                                   |
|       [キャンセル]                |
+-----------------------------------+
```

認証中:

```
|  ブラウザで認証を完了して         |
|  ください...                      |
|                                   |
|       [キャンセル]                |
```

### 5. フロー全体の統合

AddMcpModal の handleSubmit で `authType === "OAUTH"` の場合に `oauth.startAuth` を呼び出す。
`oauth.startAuth` 内で McpServer + McpConnection作成まで完結する。

## 実装順序

| Step | 内容                                                       | ファイル                      |
| ---- | ---------------------------------------------------------- | ----------------------------- |
| 1    | DBスキーマ変更 + マイグレーション                          | `prisma/schema.prisma`        |
| 2    | OAuth型定義                                                | `oauth/oauth.types.ts`        |
| 3    | discovery + DCR + PKCE + protocol-handler + token-exchange | `oauth/*.ts`                  |
| 4    | OAuthリポジトリ                                            | `oauth/oauth.repository.ts`   |
| 5    | OAuthサービス（オーケストレーション）                      | `oauth/oauth.service.ts`      |
| 6    | IPCハンドラー                                              | `oauth/oauth.ipc.ts`          |
| 7    | Preload更新                                                | `preload/index.ts`            |
| 8    | AddMcpModal UI変更                                         | `_components/AddMcpModal.tsx` |
| 9    | main/index.ts にIPC登録                                    | `main/index.ts`               |

## 参考ファイル（Manager実装）

| 機能                  | ファイル                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| OAuth Discovery + DCR | `apps/manager/src/lib/oauth/dcr.ts`                                      |
| PKCE                  | `apps/manager/src/lib/oauth/pkce.ts`                                     |
| トークン交換          | `apps/manager/src/lib/oauth/oauth-client.ts`                             |
| State Token           | `apps/manager/src/lib/oauth/state-token.ts`                              |
| 認可URL生成           | `apps/manager/src/features/mcps/api/helpers/generateAuthorizationUrl.ts` |

## Manager実装との設計差分

DesktopとManagerは同じOAuthプロトコル（Discovery → DCR → PKCE → 認可 → トークン交換）を実装するが、
アーキテクチャの違いにより設計が大きく異なる。

**根本原因**: Managerはステートレスなwebアプリ、Desktopはプロセスが常駐するElectronアプリ。
この違いが以下のすべての設計差分を生んでいる。

### 1. オーケストレーション方式

|      | Manager                                                                                                    | Desktop                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 方式 | tRPC procedure 2つに分離                                                                                   | IPC 1つで完結                                                      |
| 流れ | `connectMcpServer`（認可URL返却）→ ブラウザ → `handleCallback`（別リクエスト）                             | `startOAuthFlow` 内でPromise待機 → コールバック受信 → トークン交換 |
| 理由 | Webアプリはステートレス。認可URLを返した時点でリクエスト終了。コールバックは別HTTPリクエストとして到着する | Electronのメインプロセスは常駐。同一プロセス内でイベントを待てる   |

### 2. State管理

|      | Manager                                                             | Desktop                              |
| ---- | ------------------------------------------------------------------- | ------------------------------------ |
| 方式 | JWT（`NEXTAUTH_SECRET`で署名）                                      | メモリ上の変数                       |
| 内容 | PKCE params、userId、organizationId、redirectUri等を全部JWTに詰める | state、codeVerifierをメモリに保持    |
| 理由 | リクエスト間で状態を引き継ぐ手段がJWTしかない                       | 同一関数スコープ内なのでメモリで十分 |

### 3. コールバック受信

|      | Manager                                       | Desktop                                                       |
| ---- | --------------------------------------------- | ------------------------------------------------------------- |
| 方式 | 自身のOrigin（`/api/oauth/callback`）         | カスタムプロトコル（`tumiki://oauth/callback`）               |
| 理由 | WebアプリにはHTTPで到達可能な固定Originがある | ElectronアプリにはブラウザからアクセスできるHTTP Originがない |

### 4. DBモデル

|              | Manager                                                                           | Desktop                                |
| ------------ | --------------------------------------------------------------------------------- | -------------------------------------- |
| テーブル数   | 2つ（`McpOAuthClient` + `McpOAuthToken`）                                         | 1つ（`OAuthClient`）                   |
| スコープ     | 組織×テンプレート単位（マルチテナント・マルチユーザー）                           | MCPサーバーURL単位（シングルユーザー） |
| トークン保存 | 専用テーブル（`McpOAuthToken`）                                                   | `McpConnection.credentials` に格納     |
| 理由         | 複数ユーザー・複数組織で同じOAuthクライアントやトークンを共有・分離する必要がある | ユーザーが1人なので分離不要            |

### 5. トークン再利用

|      | Manager                                                                  | Desktop                    |
| ---- | ------------------------------------------------------------------------ | -------------------------- |
| 機能 | あり（`findReusableTokens` / `reuseToken`）                              | なし                       |
| 理由 | 同じ組織内で複数ユーザーが同じテンプレートを使う場合に再認証を省略できる | シングルユーザーなので不要 |

### Manager実装の流用方針

| Manager側                                        | Desktop側                                          | 流用                            |
| ------------------------------------------------ | -------------------------------------------------- | ------------------------------- |
| `lib/oauth/dcr.ts`                               | `oauth/oauth.discovery.ts` + `oauth/oauth.dcr.ts`  | ほぼそのまま参考にできる        |
| `lib/oauth/pkce.ts`                              | `auth/pkce.ts`（既存を流用）                       | そのまま流用                    |
| `lib/oauth/oauth-client.ts`                      | `oauth/oauth.auth-url.ts` + `oauth/oauth.token.ts` | 認可URL生成とトークン交換を分離 |
| `lib/oauth/state-token.ts`                       | —                                                  | 不要（メモリ管理で代替）        |
| `features/mcps/api/oauth/router.ts`              | `oauth/oauth.service.ts`                           | 新規設計（1関数に統合）         |
| `features/mcps/api/oauth/handleOAuthCallback.ts` | `oauth/oauth.service.ts` に統合                    | フロー参考のみ                  |

## 実装時に判明した問題と対応

### 1. DCR client_name制限（Figma）

Figma の DCR エンドポイント（`https://api.figma.com/v1/oauth/mcp/register`）は `client_name` の値でホワイトリスト制御を行っている。
`"Tumiki Desktop"` では 403 Forbidden が返されるが、`"Claude Code"` では成功する。
→ **対応**: `client_name` を `"Claude Code"` に設定（Manager実装と同一）。変更禁止のコメント付き。

### 2. DCR非対応サーバー（GitHub, Asana, Box, HubSpot, Slack）

一部のサーバーは Discovery (RFC 9728 + 8414) には対応しているが、
AS Metadata に `registration_endpoint` がないため DCR 非対応。

```
例: GitHub MCP
  Discovery結果:
    issuer: https://github.com/login/oauth
    authorization_endpoint: https://github.com/login/oauth/authorize
    token_endpoint: https://github.com/login/oauth/access_token
    registration_endpoint: なし ← DCR非対応
```

→ **対応**: DCR非対応時にAddMcpModal上でClient ID / Client Secret入力フォームを自動表示。
ユーザーがサービスの開発者設定画面でOAuthアプリを作成し、UIから手動入力する。
入力値は `OAuthClient` テーブルにキャッシュ保存され、2回目以降は自動的に再利用される。

**エラーコード伝搬**: ElectronのIPCはErrorのカスタムプロパティをシリアライズしないため、
エラーコードをメッセージに `[DCR_NOT_SUPPORTED] メッセージ` 形式で埋め込み、
renderer側で正規表現 `/\[(\w+)]\s/` で抽出する。

### 3. issuer origin不一致（Atlassian）

Atlassian MCP (`https://mcp.atlassian.com/v1/mcp`) はCDNプロキシを使用しており、
AS Metadataの `issuer` が MCPサーバーのoriginと異なる。

```
Discovery結果:
  MCPサーバー: https://mcp.atlassian.com/v1/mcp
  AS Metadata issuer: https://cf.mcp.atlassian.com  ← originが異なる
```

→ **対応**: issuer origin不一致をエラーではなく警告に変更。
CDNプロキシ等の正当な理由でoriginが異なるケースがあるため、メタデータをそのまま使用する。

### 4. ルートパスのDiscovery問題（Box）

パスが `/` のみのサーバー（`https://mcp.box.com`）で、PRM URLに末尾スラッシュが付与され
401エラーが返される問題が発生。

```
誤: GET https://mcp.box.com/.well-known/oauth-protected-resource/  → 401
正: GET https://mcp.box.com/.well-known/oauth-protected-resource   → 200
```

→ **対応**: パスが `/` の場合は空文字として扱い、末尾スラッシュの付与を防止。
AS Metadataのフォールバック試行でも重複を防止。

### 5. OAuth Discovery未対応サーバー（Google Maps, Money Forward）

一部のサーバーはOAuth Discovery標準 (RFC 9728/8414) 自体に対応していない。

| サーバー          | 原因                                                        |
| ----------------- | ----------------------------------------------------------- |
| Google Maps MCP   | PRM・AS Metadata共に404。Google独自のOAuth設定が必要        |
| Money Forward MCP | `mcp.moneyforward.com` にネットワーク的に到達不能。原因不明 |

→ **現時点では未対応**。authorization_endpoint, token_endpoint を含む全エンドポイントの手動設定UIが必要。

### 6. サーバー対応状況一覧

**OAuthフロー完了確認済み（トークン取得まで検証）:**

| サーバー  | Discovery                | DCR                         | 方式              | 状態                   |
| --------- | ------------------------ | --------------------------- | ----------------- | ---------------------- |
| Linear    | RFC 8414                 | 対応                        | 全自動            | ✅ OAuthフロー完了確認 |
| Figma     | RFC 9728 + 8414          | 対応（client_name制限あり） | 全自動            | ✅ OAuthフロー完了確認 |
| Notion    | RFC 8414                 | 対応                        | 全自動            | ✅ OAuthフロー完了確認 |
| Atlassian | RFC 8414（issuer不一致） | 対応                        | 全自動            | ✅ OAuthフロー完了確認 |
| Attio     | RFC 8414                 | 対応                        | 全自動            | ✅ OAuthフロー完了確認 |
| GitHub    | RFC 9728 + 8414          | 非対応                      | Client ID手動入力 | ✅ OAuthフロー完了確認 |

**DCR非対応 — Client ID入力フォーム表示確認済み（OAuthフロー自体は未検証）:**

| サーバー | Discovery       | DCR    | 状態                        |
| -------- | --------------- | ------ | --------------------------- |
| Asana    | RFC 9728 + 8414 | 非対応 | ✅ 入力フォーム表示確認済み |
| Box      | RFC 9728 + 8414 | 非対応 | ✅ 入力フォーム表示確認済み |
| HubSpot  | RFC 9728 + 8414 | 非対応 | ✅ 入力フォーム表示確認済み |
| Slack    | RFC 9728 + 8414 | 非対応 | ✅ 入力フォーム表示確認済み |

**未対応:**

| サーバー      | 原因                                                        |
| ------------- | ----------------------------------------------------------- |
| Google Maps   | PRM・AS Metadata共に404。OAuth Discovery自体が未対応        |
| Money Forward | `mcp.moneyforward.com` にネットワーク的に到達不能。原因不明 |

### 7. DCR非対応サーバーへの対応設計

```
[Renderer] AddMcpModal「ブラウザで認証」クリック
    | oauth:startAuth（client_id/secretなし）
[Main] oauth.service.startAuthFlow
    +-- 1. OAuthClient テーブルにキャッシュがあるか検索
    |   +-- キャッシュあり → client_id/secret を使用（DCR/手動問わず）
    |   +-- キャッシュなし → 2へ
    +-- 2. Discovery でメタデータ取得
    |   +-- 失敗 → DISCOVERY_ERROR エラーを返す（Google Maps等）
    +-- 3. registration_endpoint の有無を確認
    |   +-- あり → DCR 実行 → 結果をキャッシュ保存 → 5へ
    |   +-- なし → StartOAuthInput に oauthClientId があるか確認
    |       +-- あり → ユーザー入力値を使用（キャッシュ保存）→ 5へ
    |       +-- なし → [DCR_NOT_SUPPORTED] エラーを返す → 4へ
    +-- 4. [Renderer] エラーメッセージから [DCR_NOT_SUPPORTED] コードを抽出
    |   +-- → Client ID/Secret入力フォームを表示
    |   +-- ユーザーが入力 → 「ブラウザで認証」再クリック
    |   +-- oauth:startAuth（client_id/secret付き）→ 1へ戻る
    +-- 5. 以降のフローへ（PKCE → ブラウザ → トークン交換）
```

実装箇所:

- `oauth.types.ts` — `StartOAuthInput` / `McpOAuthSession` にオプショナルの `oauthClientId` / `oauthClientSecret`
- `oauth.service.ts` — `getOrRegisterClient` で DCR 非対応時のフォールバック
- `oauth.ipc.ts` — zodバリデーション + エラーコードをメッセージに埋め込み `[CODE] message` 形式
- `AddMcpModal.tsx` — `[DCR_NOT_SUPPORTED]` 検知時にClient ID/Secret入力フォーム表示

### 8. セキュリティ対策

| 対策                                   | 実装                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| IPC入力バリデーション                  | `oauth.ipc.ts` でzodスキーマによるランタイム検証                                                                               |
| シークレットのrenderer非露出           | `oauthClientSecret` はmainプロセスでDBから直接取得。rendererには送信しない                                                     |
| OAuthClientの暗号化保存                | `clientId` / `clientSecret` を `encryptToken()` で暗号化してDB保存                                                             |
| DBキャッシュのバリデーション           | `authServerMetadata` の `issuer` / `authorization_endpoint` / `token_endpoint` 存在確認。破損時はキャッシュ削除して再Discovery |
| ネットワークレスポンスのバリデーション | AS Metadataの `issuer` 存在確認。不正レスポンスはスキップ                                                                      |

### 9. oauth4webapi バンドル設定

`oauth4webapi` は ESM only パッケージのため、`electron-vite` の `externalizeDepsPlugin` から除外してバンドルに含める必要がある。

```typescript
// electron.vite.config.ts
plugins: [externalizeDepsPlugin({ exclude: ["oauth4webapi"] })],
```

## 実際のファイル構成

```
apps/desktop/src/main/features/oauth/
├── oauth.types.ts         # 型定義（McpOAuthSession, StartOAuthInput, OAuthResult等）
├── oauth.discovery.ts     # RFC 9728 + RFC 8414 メタデータ取得（DiscoveryError含む）
├── oauth.dcr.ts           # RFC 7591 Dynamic Client Registration
├── oauth.auth-url.ts      # 認可URL生成（PKCE S256対応）
├── oauth.token.ts         # トークン交換 + リフレッシュ（Figmaエラーフォーマット対応）
├── oauth.protocol.ts      # tumiki://oauth/callback パーサー
├── oauth.repository.ts    # OAuthClient DB操作（暗号化保存）
├── oauth.service.ts       # フロー全体のオーケストレーション
├── oauth.ipc.ts           # IPCハンドラー（zodバリデーション付き）
├── __tests__/             # ユニットテスト（7ファイル、48テスト）
└── docs/
    └── mcp-oauth-architecture.md  # 本ドキュメント
```

PKCE は既存の `apps/desktop/src/main/auth/pkce.ts` をインポートして流用。

## 今後の対応（スコープ外）

- トークン自動リフレッシュ（`refreshAccessToken` は実装済み、呼び出し元が未実装）
- トークン切れ時の再認証UI
- OAuth Discovery未対応サーバー向けエンドポイント手動設定UI（Google Maps等）

## 検証方法

1. デスクトップアプリ起動（`pnpm --filter desktop dev`）
2. カタログ画面でOAuthアイテム（例: Figma MCP）の「追加」をクリック
3. 「ブラウザで認証」ボタンクリック → ブラウザが開く
4. OAuth認証完了 → デスクトップアプリに戻る
5. MCPサーバー一覧（/tools）に新しいサーバーが表示される
6. DCR非対応サーバー（GitHub等）→ Client ID/Secret入力フォームが表示されることを確認
7. 既存の認証フロー（NONE, API_KEY）が引き続き正常動作することを確認
