# Keycloak移行 実装状況と残タスク

最終更新: 2025年10月30日

## 📊 進捗状況サマリー

| Phase | 進捗 | ステータス |
|-------|------|----------|
| Phase 1: パッケージ基盤整備 | 100% | ✅ 完了 |
| Phase 2: Manager App統合 | 50% | 🔨 進行中（Auth0切り離し作業中） |
| Phase 3: Keycloak環境構築 | 100% | ✅ 完了 |
| Phase 4: Proxy Server OAuth認証 | 75% | 🔨 進行中 |
| Phase 5: Backend OAuth連携 | 0% | ⏳ 未着手 |
| Phase 6: セキュリティ強化 | 0% | ⏳ 未着手 |
| Phase 7: テスト | 0% | ⏳ 未着手 |
| Phase 8: ドキュメント・デプロイ | 0% | ⏳ 未着手 |

**全体進捗: 約40%完了**

**現在の最優先タスク**: Manager App - Auth0からBetter Authへの切り替え

## 実装完了項目

### ✅ Phase 1: パッケージ基盤整備

#### 1.1 @tumiki/better-auth パッケージ
- [x] Better Auth設定ファイル (`config.ts`)
- [x] Keycloak OAuth Providerの統合
- [x] ユーザーフィールドマッピング (`keycloakId`, `role`)
- [x] セッション管理設定
- [x] サーバーサイドAPI (`server.ts`)
- [x] クライアントサイドAPI (`client.ts`)

#### 1.2 @tumiki/oauth-token-manager パッケージ
- [x] トークンキャッシュ管理 (`token-cache.ts`)
- [x] Redis接続管理 (`redis-connection.ts`)
- [x] 暗号化ユーティリティ (`crypto.ts`)
- [x] 型定義 (`types.ts`)
- [x] トークンリフレッシュ (`token-refresh.ts`)
- [x] ロガー設定 (`logger.ts`)
- [x] トークンリポジトリ (`token-repository.ts`)
- [x] バリデーター (`token-validator.ts`)
- [x] メイン管理クラス (`oauth-token-manager.ts`)

#### 1.3 データベーススキーマ
- [x] `User`テーブル - `keycloakId`フィールド追加
- [x] Better Auth用テーブル (`Session`, `Account`, `Verification`)
- [x] `ExternalOAuthConnection`テーブル (Notion/Figma用)
- [x] `BetterAuthOAuthSession`テーブル (PKCE用)
- [x] `OAuthClient`テーブル (Backend MCP用)
  - DCR（Dynamic Client Registration）情報
  - Authorization Server情報（token/authorization/registration エンドポイント）
  - Protected Resource情報
  - クライアント設定（scopes, grantTypes, responseTypes）
- [x] `OAuthToken`テーブル - `tokenPurpose`フィールド追加
  - `TUMIKI_CLIENT`: AIクライアントが使用するTumikiトークン
  - `BACKEND_MCP`: Backend MCPサーバーへのアクセストークン
- [x] `OAuthSession`テーブル (認証フロー管理用)
- [ ] `McpApiKey`テーブル - `scopes`フィールド追加（Backend MCP用スコープ管理）

### 🔨 Phase 2: Manager App統合（進行中）

#### 2.1 Better Auth API Routes（完了）
- [x] Better Auth API Routes (`/api/auth/[...all]/route.ts`)
- [x] 既存のAuth0 Webhookルート維持 (`/api/auth/sync-user/route.ts`)

#### 2.2 Auth0からBetter Authへの移行（最優先実装中）

**現状**: Manager Appは現在Auth0を使用
- Middleware: `@tumiki/auth/edge`から`auth0`, `auth0OAuth`をインポート
- 認証チェック: `auth0.getSession(request)`
- OAuth専用パス: `auth0OAuth.middleware(request)`

**移行タスク**:
- [ ] **Middleware更新** (`apps/manager/src/middleware.ts`)
  - Auth0インポート削除
  - Better Auth セッション確認に変更
  - 検証モードとの互換性維持

- [ ] **認証パッケージ更新** (`packages/auth/`)
  - `edge.ts`: Auth0削除、Better Auth統合
  - `clients.ts`: Auth0クライアント削除

- [ ] **Server Components更新**
  - `auth()` → `getSession()` への全置換
  - ユーザー情報取得ロジック更新

- [ ] **Client Components更新**
  - Better Auth hooks使用
  - ログイン/ログアウトUI更新

- [ ] **tRPC Context更新**
  - セッション取得ロジック変更
  - protectedProcedure更新

- [ ] **環境変数整理**
  - Auth0環境変数削除
  - Better Auth環境変数確認

---

## 🔨 残りの実装タスク

### ✅ Phase 3: Keycloak環境構築 (完了)

#### 3.1 インフラ構成
- [x] **Docker Compose設定** (`docker/keycloak/compose.yaml`)
  - Keycloakコンテナ設定 (quay.io/keycloak/keycloak:26.0)
  - PostgreSQLデータベース設定 (postgres:16-alpine)
  - ヘルスチェック設定
  - ボリューム設定 (keycloak-db-data)

- [x] **環境変数設定**
  - `KEYCLOAK_ADMIN=admin` / `KEYCLOAK_ADMIN_PASSWORD=admin123`
  - `KC_DB_PASSWORD=keycloak123`
  - ポート: `8443:8080`

#### 3.2 Keycloak初期設定 (完了)
- [x] **Realm作成** (`tumiki-realm.json`)
  - realm: `tumiki`
  - displayName: "Tumiki Platform"
  - sslRequired: `external`
  - 自動インポート設定 (`--import-realm`)

- [x] **Manager App用クライアント作成**
  ```json
  {
    "clientId": "tumiki-manager",
    "secret": "tumiki-manager-secret-change-in-production",
    "redirectUris": [
      "http://localhost:3000/*",
      "https://local.tumiki.cloud:3000/*",
      "https://manager.tumiki.cloud/*"
    ],
    "pkce.code.challenge.method": "S256"
  }
  ```

- [x] **ロール設定**
  - `admin` - 管理者ロール
  - `user` - 一般ユーザーロール
  - `viewer` - 読み取り専用ロール

- [x] **テストユーザー作成**
  - Email: `admin@tumiki.local`
  - Password: `admin123`
  - Role: `admin`

#### 3.3 使用方法
```bash
# 起動
cd docker/keycloak
docker compose up -d

# 管理コンソール
http://localhost:8443/admin/
Username: admin
Password: admin123

# Manager App環境変数
KEYCLOAK_ISSUER=http://localhost:8443/realms/tumiki
KEYCLOAK_CLIENT_ID=tumiki-manager
KEYCLOAK_CLIENT_SECRET=tumiki-manager-secret-change-in-production
```

#### 3.4 残タスク (優先度: 中)
- [ ] **クライアントスコープ設定** (AIクライアント用)
  - `mcp:access:notion`
  - `mcp:access:figma`
  - `mcp:read`
  - `mcp:write`

---

### 🔨 Phase 4: Proxy Server - OAuth認証実装 (進行中)

#### 4.1 認証ミドルウェア (優先度: 高) - 🔨 **実装中**

**実装済みファイル:**

1. **`apps/proxyServer/src/middleware/keycloakAuth.ts`** (新規作成)
   - `keycloakAuthMiddleware()`: Keycloak JWT検証ミドルウェア
     - JWKSを使用したJWT署名検証 (`jose`ライブラリ)
     - issuer検証 (`KEYCLOAK_ISSUER`環境変数)
     - 有効期限検証（自動）
     - エラーハンドリング (401)
   - `requireScopesMiddleware(requiredScopes)`: スコープ検証ミドルウェア
     - 必要なスコープの配列を検証
     - スコープ不足時に403エラー
   - 型定義: `KeycloakJWTPayload`

2. **`apps/proxyServer/src/middleware/integratedAuth.ts`** (更新)
   - `express-oauth2-jwt-bearer` → `jose` への完全移行
   - Auth0 JWKS → Keycloak JWKS への変更
   - `OAUTH` authTypeでのJWT検証ロジック更新
   - `KeycloakJWTPayload` 型定義追加
   - スコープを配列に変換（スペース区切り → 配列）

3. **`apps/proxyServer/src/middleware/auth.ts`** (部分更新)
   - Keycloak JWKS設定への変更
   - 条件付き認証ミドルウェアの更新開始

**技術詳細:**
- **JWT検証ライブラリ**: `jose` v6.1.0
  - JWKS自動取得とキャッシング
  - RS256署名アルゴリズム対応
  - TypeScript型安全性
- **環境変数**:
  - `KEYCLOAK_ISSUER`: Keycloak issuer URL (例: `http://localhost:8443/realms/tumiki`)
  - JWKS URI: `${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`

**残タスク:**
- [ ] 型エラーの修正（`auth.ts`の完全な移行）
- [ ] ビルド確認とテスト
- [ ] 既存エンドポイントへの適用確認

#### 4.2 OAuth Endpoints (優先度: 中)
- [ ] **クライアント登録エンドポイント** (`POST /oauth/register`)
  - Keycloak Admin APIでのクライアント作成
  - `McpApiKey`テーブルへの保存
  - client_id / client_secret の返却

- [ ] **トークン取得エンドポイント** (`POST /oauth/token`)
  - client_credentialsフロー実装
  - Keycloakトークンエンドポイントへのプロキシ

- [ ] **トークン取り消しエンドポイント** (`POST /oauth/revoke`)
  - Keycloakトークン取り消し
  - 監査ログ記録

#### 4.3 MCPプロキシ統合 (優先度: 高)
- [ ] **既存MCPエンドポイントの統合**
  - `keycloakAuthMiddleware`の適用
  - スコープベースアクセス制御
  - Backend MCPトークン取得統合

---

### Phase 5: Backend OAuth連携とManager UI実装

#### 5.1 Dynamic Client Registration (DCR) 実装 (優先度: 中)
- [ ] **DCRライブラリ実装** (`apps/proxyServer/src/lib/oauth-dcr.ts`)
  - RFC 7591準拠のDCR実装
  - Authorization Server Metadata取得（`.well-known/oauth-authorization-server`）
  - クライアント登録リクエスト実装
  - レスポンス処理（client_id, client_secret保存）
  - エラーハンドリング

#### 5.2 OAuth認証フロー実装 (優先度: 中)
- [ ] **Authorization Code + PKCE フロー**
  - 認証URL生成ロジック
  - PKCEチャレンジ生成（code_verifier, code_challenge）
  - コールバックエンドポイント実装（`GET /oauth/callback`）
  - トークン交換リクエスト（認可コード → アクセストークン）
  - トークン暗号化してDB保存

#### 5.3 Manager UI - MCP Server OAuth設定 (優先度: 中)
**実装ファイル**: `apps/manager/src/app/(dashboard)/settings/mcp-servers/[serverId]/oauth.tsx`

- [ ] **OAuth認証開始ボタン**
  - ポップアップウィンドウでの認証フロー
  - 認証完了通知
  - エラー表示
  - 認証状態表示（トークン有効期限等）

- [ ] **トークン管理UI**
  - トークン一覧表示
  - トークン手動リフレッシュ
  - トークン削除（再認証）
  - トークン有効期限表示

#### 5.4 tRPC Router - OAuth Token管理 (優先度: 中)
- [ ] **oauthToken.ts ルーター**
  - トークン一覧取得API
  - トークンリフレッシュAPI
  - トークン削除API
  - DCR登録API
  - OAuth認証URL生成API

---

### Phase 6: セキュリティ強化

#### 6.1 監査ログ (優先度: 中)
- [ ] **AuditLogテーブル設計・作成**
- [ ] **ロギングミドルウェア実装**
  - 認証成功/失敗
  - トークンリフレッシュ
  - トークン取り消し
  - スコープ検証失敗

#### 6.2 レート制限 (優先度: 低)
- [ ] **Redisベースのレート制限**
  - `/oauth/token`: 100リクエスト/時間/クライアント
  - `/mcp/*`: 1000リクエスト/時間/ユーザー
  - `/oauth/register`: 10リクエスト/時間/IP

---

### Phase 7: テスト

#### 7.1 単体テスト (優先度: 高)
- [ ] **@tumiki/better-auth テスト**
  - Keycloak認証フローテスト
  - セッション管理テスト

- [ ] **@tumiki/oauth-token-manager テスト**
  - トークン取得テスト
  - トークンリフレッシュテスト
  - キャッシュ管理テスト

- [ ] **Proxy Server認証ミドルウェアテスト**
  - JWT検証テスト
  - スコープ検証テスト

#### 7.2 統合テスト (優先度: 中)
- [ ] **E2Eテスト**
  - Manager Appログインフロー
  - AIクライアント登録フロー
  - MCPリクエストプロキシフロー
  - トークン自動リフレッシュフロー

---

### Phase 8: ドキュメント・デプロイ

#### 8.1 ドキュメント (優先度: 中)
- [ ] **APIドキュメント**
  - OpenAPI仕様書
  - Swagger UI セットアップ

- [ ] **ユーザーガイド**
  - MCPサーバーのOAuth認証設定方法
  - AIクライアントの認証方法
  - トラブルシューティング

#### 8.2 デプロイ (優先度: 高)
- [ ] **ステージング環境**
  - Keycloakデプロイ
  - アプリケーションデプロイ
  - 動作確認

- [ ] **本番環境**
  - Blue-Greenデプロイメント
  - モニタリング設定
  - Auth0廃止

---

## 優先順位マトリクス

### 🔴 最優先 (Week 1-2) - ユーザー認証移行（Manager App）
1. ✅ ~~Keycloak環境構築 (Docker Compose + 初期設定)~~ **完了**
2. ✅ ~~Better Auth パッケージ作成~~ **完了**
3. 🔨 **Manager App - Auth0からBetter Authへの切り替え** ← **最優先実装中**

   **3.1 Middleware更新** (`apps/manager/src/middleware.ts`)
   - [ ] Auth0インポートを削除（`@tumiki/auth/edge`から`auth0`, `auth0OAuth`）
   - [ ] Better Auth セッション確認に変更
   - [ ] 検証モードとの互換性維持
   - [ ] OAuth専用パス処理の更新

   **3.2 認証関連ファイルの更新**
   - [ ] `@tumiki/auth`パッケージの更新
     - [ ] `packages/auth/src/edge.ts` - Auth0削除、Better Auth統合
     - [ ] `packages/auth/src/clients.ts` - Auth0クライアント削除
   - [ ] `apps/manager/src/lib/auth.ts` - セッション取得ロジック更新

   **3.3 Server Components更新**
   - [ ] `auth()` → `getSession()` への置換（全Server Components）
   - [ ] ユーザー情報取得ロジックの更新
   - [ ] ロール・権限チェックロジックの更新

   **3.4 Client Components更新**
   - [ ] Better Auth hooks使用（`useSession()`, `signIn()`, `signOut()`）
   - [ ] ログインボタン・ログアウトボタンの更新
   - [ ] ユーザープロフィール表示の更新

   **3.5 tRPC Context更新**
   - [ ] `apps/manager/src/server/api/trpc.ts` - セッション取得ロジック変更
   - [ ] protectedProcedure の認証チェック更新

   **3.6 環境変数の整理**
   - [ ] Auth0関連の環境変数を削除
     - `AUTH0_SECRET`
     - `AUTH0_BASE_URL`
     - `AUTH0_ISSUER_BASE_URL`
     - `AUTH0_CLIENT_ID`
     - `AUTH0_CLIENT_SECRET`
   - [ ] Better Auth環境変数の確認
     - `BETTER_AUTH_SECRET`
     - `BETTER_AUTH_URL`
     - `KEYCLOAK_ISSUER`
     - `KEYCLOAK_CLIENT_ID`
     - `KEYCLOAK_CLIENT_SECRET`

4. 🔨 **動作確認とテスト**
   - [ ] Keycloakログイン/ログアウト動作確認
   - [ ] セッション管理の動作確認
   - [ ] 検証モードの動作確認
   - [ ] OAuth専用パスの動作確認
   - [ ] 既存機能の互換性確認
   - [ ] E2Eテスト実行

### 🟡 高優先度 (Week 3-4) - AIクライアント認証
5. 🔨 **Proxy Server JWT検証ミドルウェア実装** ← **進行中**
   - Keycloak JWT検証ミドルウェア作成済み
   - 統合認証ミドルウェアの更新完了
   - 残タスク: 型エラー修正とテスト
6. OAuth Endpoints実装 (`/oauth/register`, `/oauth/token`)
7. 既存MCPエンドポイントへのKeycloak認証統合

### 🟢 中優先度 (Week 5-6) - Backend OAuth連携
7. Dynamic Client Registration (DCR) 実装
8. OAuth認証フロー実装（Authorization Code + PKCE）
9. Manager UI OAuth設定画面実装
10. トークン管理UI実装

### 🟢 中優先度 (Week 7-8) - セキュリティ・テスト
11. 監査ログシステム実装
12. 統合テスト・E2Eテスト
13. APIドキュメント作成

### 🔵 低優先度 (Week 9+)
14. レート制限実装
15. ユーザーガイド作成
16. ステージング環境デプロイ・検証
17. 本番環境デプロイ

---

## アーキテクチャ変更点

### 現行 (Auth0)
```
AIクライアント → Auth0 M2M → Proxy Server → Backend MCP
                           ↓
                      JWT検証
```

### 移行後 (Keycloak)
```
AIクライアント → Keycloak M2M → Proxy Server → Backend MCP
                             ↓
                        JWT検証 (JWKS)
```

### 主な変更点
1. **認証プロバイダー**: Auth0 → Keycloak
2. **JWT検証**: Auth0 JWKS → Keycloak JWKS
3. **トークン発行**: Auth0 token endpoint → Keycloak token endpoint
4. **クライアント登録**: 手動 → Dynamic Client Registration (DCR)

---

## 技術的依存関係

### 必須パッケージ
- ✅ `better-auth`: v1.3.4 (インストール済み)
- ✅ `redis`: v5.0.1 (インストール済み)
- ✅ `jose`: v6.1.0 (インストール済み) - JWT検証用
- 🔨 `bcrypt`: パスワードハッシュ用 (追加必要)

### 環境要件
- ✅ Node.js >= 22.14.0
- ✅ PostgreSQL 14+
- ✅ Redis 7+
- ✅ Keycloak 26.0 (Docker) - インフラ準備完了

---

## リスク管理

### 技術リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| JWT検証失敗 | 高 | JWKSキャッシュ、フォールバック機構 |
| トークンリフレッシュ失敗 | 中 | リトライロジック、ユーザー通知 |
| Keycloak環境構築の遅延 | 高 | 早期検証、ドキュメント熟読 |

### 移行リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| ダウンタイム | 高 | Blue-Greenデプロイメント |
| データ移行失敗 | 高 | ロールバック計画、十分なテスト |
| ユーザー混乱 | 中 | 事前通知、詳細なドキュメント |

---

## 次のステップ

### 即座に実行すべきタスク（優先順位順）

#### 🔴 最優先タスク
1. 🔨 **Manager App - Auth0切り離し作業** ← **今すぐ実施**
   - Middleware更新（`apps/manager/src/middleware.ts`）
   - 認証パッケージ更新（`packages/auth/`）
   - Server Components更新（`auth()` → `getSession()`）
   - Client Components更新（Better Auth hooks）
   - tRPC Context更新
   - 環境変数整理
   - 動作確認・テスト

#### ✅ 完了済みタスク
2. ✅ 実装状況の整理 (このドキュメント) - **完了**
3. ✅ Keycloak Docker Compose設定の作成 - **完了**
4. ✅ Keycloak Realm/Client初期設定 - **完了**

#### 🔨 進行中タスク
5. 🔨 **Proxy Server JWT検証ミドルウェア実装** - **進行中 (90%完了)**
   - ✅ `keycloakAuth.ts` ミドルウェア作成
   - ✅ `integratedAuth.ts` 更新
   - ✅ `jose` パッケージ追加
   - ✅ `express-oauth2-jwt-bearer` 削除
   - ⏳ 型エラー修正（`auth.ts`）
   - ⏳ ビルド確認

#### ⏳ 次のタスク
6. ⏳ Manager App統合の完了確認とE2Eテスト
7. ⏳ Proxy Server統合テストの実装

### マイルストーン
- **Week 1-2**: Keycloak環境構築 + 基本認証実装
- **Week 3-4**: OAuth Endpoints + Manager UI実装
- **Week 5-6**: テスト + ドキュメント + セキュリティ強化
- **Week 7+**: ステージング検証 + 本番デプロイ

---

## 参考資料

### 設計ドキュメント
- [Keycloak実装計画書](./keycloak-onpremise-implementation.md) - オンプレミスKeycloak構築計画
- [二層OAuth認証アーキテクチャ](./auth/two-tier-oauth-architecture.md) - 推奨アーキテクチャ設計
- [二層OAuth認証実装計画](./auth/two-tier-oauth-implementation-plan.md) - 詳細な実装タスク計画
- [MCP OAuth認証設計](./auth/mcp-oauth-authentication-design.md) - MCP準拠の認証設計

### 技術仕様
- [Better Auth ドキュメント](https://better-auth.com/) - Better Auth公式ドキュメント
- [Keycloak 公式ドキュメント](https://www.keycloak.org/docs/) - Keycloak公式ドキュメント
- [RFC 6749: OAuth 2.0](https://tools.ietf.org/html/rfc6749) - OAuth 2.0仕様
- [RFC 7591: Dynamic Client Registration](https://tools.ietf.org/html/rfc7591) - DCR仕様
- [RFC 7636: PKCE](https://tools.ietf.org/html/rfc7636) - PKCE仕様

### プロジェクト管理
- Linear Issue DEV-890: Auth0からKeycloakへの移行
- Linear Issue DEV-891: Remote MCP OAuth認証の登録機能実装
