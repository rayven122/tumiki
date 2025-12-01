# 環境変数リファレンス

Tumikiプロジェクトで使用される環境変数の完全なリファレンスです。

## 凡例

| アイコン | 分類         | 説明                                     |
| -------- | ------------ | ---------------------------------------- |
| 🔴       | **必須**     | アプリケーション起動に必要               |
| 🟢       | **任意**     | 機能を有効化する場合に必要               |
| 🔵       | **テスト用** | テスト環境のみで使用（本番環境では不要） |

---

## 環境変数一覧

### データベース設定

| 変数名         | 分類 | デフォルト値 | 説明                                                                                      |
| -------------- | ---- | ------------ | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL` | 🔴   | -            | PostgreSQLデータベースの接続URL<br>例: `postgresql://user:password@localhost:5434/tumiki` |

**使用箇所:**

- `packages/db` - Prisma Clientのデータベース接続
- すべてのバックエンドサービス

---

### Redis設定

| 変数名                  | 分類 | デフォルト値 | 説明                                                                                                                                                                                     |
| ----------------------- | ---- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REDIS_URL`             | 🔴   | -            | Redisサーバーの接続URL<br>例: `redis://localhost:6379`<br>**注意:** 未設定の場合、キャッシュ機能が無効化されます                                                                         |
| `REDIS_CONNECT_TIMEOUT` | 🟢   | `10000`      | Redis接続のタイムアウト時間（ミリ秒）                                                                                                                                                    |
| `REDIS_ENCRYPTION_KEY`  | 🔴   | -            | Redis保存データの暗号化キー（64文字の16進数文字列）<br>OAuthトークン、キャッシュデータの暗号化に使用<br>生成: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

**使用箇所:**

- `packages/oauth-token-manager` - OAuthトークンの保存・暗号化
- `apps/mcp-proxy/src/libs/crypto/encryption.ts` - キャッシュデータの暗号化
- `apps/manager` - セッション管理

---

### Keycloak認証設定

| 変数名                    | 分類 | デフォルト値 | 説明                                                                                    |
| ------------------------- | ---- | ------------ | --------------------------------------------------------------------------------------- |
| `KEYCLOAK_CLIENT_ID`      | 🔴   | -            | Keycloakクライアント識別子<br>例: `tumiki-manager`<br>CI環境では`dummy-client-id`を使用 |
| `KEYCLOAK_CLIENT_SECRET`  | 🔴   | -            | Keycloakクライアントシークレット<br>**本番環境では必ず変更すること**                    |
| `KEYCLOAK_ISSUER`         | 🔴   | -            | KeycloakサーバーのIssuer URL（Realm URL）<br>例: `http://localhost:8443/realms/tumiki`  |
| `KEYCLOAK_ADMIN_USERNAME` | 🔴   | -            | Keycloak Admin APIのユーザー名                                                          |
| `KEYCLOAK_ADMIN_PASSWORD` | 🔴   | -            | Keycloak Admin APIのパスワード<br>**本番環境では強力なパスワードを設定**                |

**使用箇所:**

- `apps/manager/src/utils/env.ts` - 認証設定の検証
- Auth.jsのKeycloakプロバイダー設定

---

### Auth.js設定

| 変数名            | 分類 | デフォルト値 | 説明                                                                                                              |
| ----------------- | ---- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET` | 🔴   | -            | Auth.jsセッション暗号化用のシークレットキー<br>OAuth State Token暗号化にも使用<br>生成: `openssl rand -base64 32` |
| `NEXTAUTH_URL`    | 🔴   | -            | Auth.jsのベースURL（認証リダイレクト、メール送信、OAuthコールバック等で使用）<br>例: `http://localhost:3000`      |

**使用箇所:**

- Auth.js セッション管理
- 認証リダイレクト・ログアウト後のリダイレクト
- 招待メール・ウェイティングリストメールのURL生成
- OAuthコールバックURL生成
- OAuth認証フローのStateトークン生成/検証

---

### MCP Proxy設定

| 変数名                      | 分類 | デフォルト値 | 説明                                                                                                                               |
| --------------------------- | ---- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_MCP_PROXY_URL` | 🔴   | -            | MCPプロキシサーバーのURL（フロントエンドから参照可能）<br>ローカル: `http://localhost:8080`<br>本番: `https://server.tumiki.cloud` |

**使用箇所:**

- フロントエンド - MCPサーバーへのAPI呼び出し

---

### Prismaフィールド暗号化設定

| 変数名                              | 分類 | デフォルト値 | 説明                                                                                                                                                              |
| ----------------------------------- | ---- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRISMA_FIELD_ENCRYPTION_KEY`       | 🔴   | -            | Prismaフィールド暗号化キー（Cloakライブラリ使用）<br>生成: `bunx @47ng/cloak generate` または https://cloak.47ng.com/                                             |
| `PRISMA_FIELD_DECRYPTION_KEYS`      | 🟢   | -            | Prismaフィールド復号化キー（カンマ区切りで複数指定可能、キーローテーション用）<br>生成: `bunx @47ng/cloak generate`<br>**注意:** キーローテーション運用時のみ必要 |
| `PRISMA_FIELD_ENCRYPTION_HASH_SALT` | 🔴   | -            | Prismaフィールドハッシュ化用ソルト<br>生成: `openssl rand -base64 32`                                                                                             |

**使用箇所:**

- `packages/db` - Prisma Field Encryptionによる機密フィールドの暗号化

**セキュリティ要件:**

- Cloakライブラリで生成された正しい形式のキーであること
- キーローテーション時は`PRISMA_FIELD_DECRYPTION_KEYS`に旧キーを追加

**キーローテーションについて:**

`PRISMA_FIELD_DECRYPTION_KEYS`は、以下のシナリオで使用します：

1. **定期的な暗号化キーの変更**
   - セキュリティ強化のため、定期的に暗号化キーを更新する場合
   - 新しいキー（`PRISMA_FIELD_ENCRYPTION_KEY`）で暗号化を開始
   - 古いキーで暗号化されたデータも読めるよう、旧キーを`PRISMA_FIELD_DECRYPTION_KEYS`に設定

2. **キー漏洩時の緊急対応**
   - 暗号化キーが漏洩した可能性がある場合
   - 新しいキーに切り替え
   - 既存データの再暗号化が完了するまで、旧キーも保持

**キーローテーション手順:**

```bash
# 1. 新しいキーを生成
NEW_KEY=$(bunx @47ng/cloak generate)

# 2. 現在のキーを退避
OLD_KEY="現在のPRISMA_FIELD_ENCRYPTION_KEY"

# 3. 環境変数を更新
PRISMA_FIELD_ENCRYPTION_KEY=$NEW_KEY
PRISMA_FIELD_DECRYPTION_KEYS=$OLD_KEY

# 4. すべてのデータを新キーで再暗号化
# （再暗号化スクリプトを実行）

# 5. 再暗号化完了後、PRISMA_FIELD_DECRYPTION_KEYSを削除
unset PRISMA_FIELD_DECRYPTION_KEYS
```

**注意:** キーローテーション運用計画がない場合、`PRISMA_FIELD_DECRYPTION_KEYS`の設定は不要です。

---

### キャッシュ設定

| 変数名      | 分類 | デフォルト値 | 説明                       |
| ----------- | ---- | ------------ | -------------------------- |
| `CACHE_TTL` | 🟢   | `300`        | キャッシュの有効期限（秒） |

**使用箇所:**

- `apps/mcp-proxy` - 設定キャッシュのTTL

---

### メール送信設定（SMTP）

| 変数名       | 分類 | デフォルト値 | 説明                                                                |
| ------------ | ---- | ------------ | ------------------------------------------------------------------- |
| `SMTP_HOST`  | 🟢   | -            | SMTPサーバーのホスト名<br>例: `smtp.gmail.com`                      |
| `SMTP_PORT`  | 🟢   | -            | SMTPサーバーのポート番号<br>`587` (STARTTLS) または `465` (SSL/TLS) |
| `SMTP_USER`  | 🟢   | -            | SMTP認証用のユーザー名                                              |
| `SMTP_PASS`  | 🟢   | -            | SMTP認証用のパスワード<br>Gmail: アプリパスワードを使用             |
| `FROM_EMAIL` | 🟢   | -            | 送信元メールアドレス<br>例: `info@tumiki.cloud`                     |

**使用箇所:**

- メール送信機能（招待メール等）

---

### MicroCMS設定

| 変数名                                | 分類 | デフォルト値 | 説明                                     |
| ------------------------------------- | ---- | ------------ | ---------------------------------------- |
| `MICROCMS_TUMIKI_BLOG_API_KEY`        | 🟢   | -            | MicroCMS APIキー                         |
| `MICROCMS_TUMIKI_BLOG_SERVICE_DOMAIN` | 🟢   | -            | MicroCMSサービスドメイン<br>例: `tumiki` |

**使用箇所:**

- `apps/manager/src/libs/microcms.ts` - ブログ記事取得

---

### メンテナンスモード設定

| 変数名                             | 分類 | デフォルト値 | 説明                                                                                         |
| ---------------------------------- | ---- | ------------ | -------------------------------------------------------------------------------------------- |
| `MAINTENANCE_MODE`                 | 🟢   | `false`      | メンテナンスモードの有効/無効                                                                |
| `MAINTENANCE_ALLOWED_IPS`          | 🟢   | -            | メンテナンス中でもアクセスを許可するIPアドレス（カンマ区切り）<br>例: `192.168.1.1,10.0.0.1` |
| `NEXT_PUBLIC_MAINTENANCE_END_TIME` | 🟢   | -            | メンテナンスページに表示する終了予定時刻（ISO8601形式）<br>例: `2025-01-11T03:00:00Z`        |

**使用箇所:**

- `apps/manager/src/middleware.ts` - メンテナンスページへのリダイレクト・IP制限
- `apps/manager/src/app/maintenance/page.tsx` - メンテナンス情報表示

---

### 開発・デバッグ設定

| 変数名               | 分類 | デフォルト値 | 説明                                                   |
| -------------------- | ---- | ------------ | ------------------------------------------------------ |
| `DEBUG_MULTITENANCY` | 🔵   | `false`      | マルチテナンシーのデバッグログ有効化                   |
| `LOG_LEVEL`          | 🟢   | `info`       | ログレベル<br>選択肢: `debug`, `info`, `warn`, `error` |

**使用箇所:**

- `packages/db` - マルチテナンシー関連のログ出力
- `packages/oauth-token-manager/src/logger.ts` - ログレベル
- `apps/mcp-proxy/src/libs/logger` - ログレベル
