# ローカル開発: Keycloak を使った SSO セットアップ

ローカル環境では、組み込みの Keycloak OIDC provider を使用して internal-manager の認証を検証します。

## 起動

```bash
pnpm setup:dev
```

Keycloak は `http://localhost:8888` で起動します。

## 環境変数（internal-manager）

`pnpm setup:dev` は Keycloak に internal-manager 用 OIDC client を作成します。ローカルで手動設定する場合は以下を使用してください。

```env
OIDC_ISSUER=http://localhost:8888/realms/tumiki
OIDC_CLIENT_ID=tumiki-internal-manager
OIDC_CLIENT_SECRET=tumiki-internal-manager-secret
INTERNAL_MANAGER_BOOTSTRAP_ADMIN_EMAIL=admin@tumiki.local
```

Infisical の `dev` 環境に別の OIDC 設定が入っている場合でも、ローカル Keycloak で起動するには以下を使います。

```bash
cd apps/internal-manager
pnpm dev:keycloak
```

`3100` が別プロセスで使用中の場合は、ポートを指定できます。

```bash
PORT=3101 pnpm dev:keycloak
```

## テストアカウント

| メールアドレス | パスワード | 用途 |
|---|---|---|
| admin@tumiki.local | admin123 | 管理者テストユーザー |

internal-manager 側では、空の DB に最初にログインしたユーザーが `SYSTEM_ADMIN` として作成されます。`dev:keycloak` では `INTERNAL_MANAGER_BOOTSTRAP_ADMIN_EMAIL=admin@tumiki.local` を設定するため、既存 DB に Dex 由来のユーザーが残っていても Keycloak の検証ユーザーを `SYSTEM_ADMIN` として作成できます。

## SCIM の検証

Keycloak はこのローカル構成では OIDC provider として使います。internal-manager の SCIM 受け口を検証する場合は、管理画面で SCIM token を生成し、`/api/scim/v2/Users` と `/api/scim/v2/Groups` に Bearer token 付きでリクエストしてください。
