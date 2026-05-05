# ローカル開発: Keycloak を使った SSO セットアップ

ローカル環境では、組み込みの Keycloak OIDC provider を使用して internal-manager の認証を検証します。

internal-manager の Auth.js / Desktop は Keycloak に直接接続せず、Jackson を OIDC IdP として使います。全体の env 方針は [Internal Manager Jackson 認証設定](./internal-manager-jackson-auth.md) を参照してください。

## 起動

```bash
pnpm setup:dev
```

Keycloak は `http://localhost:8888` で起動します。

## 環境変数（internal-manager）

`pnpm setup:dev` は Keycloak に internal-manager 用 OIDC client を作成します。ローカルで手動設定する場合は以下を使用してください。`TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_SECRET` は `KEYCLOAK_INTERNAL_MANAGER_CLIENT_SECRET` と同じ値を設定します。

```env
TUMIKI_INTERNAL_MANAGER_OIDC_DISCOVERY_URL=http://localhost:8888/realms/tumiki/.well-known/openid-configuration
TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_ID=tumiki-internal-manager
TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_SECRET=<KEYCLOAK_INTERNAL_MANAGER_CLIENT_SECRET>
TUMIKI_INTERNAL_MANAGER_PUBLIC_URL=http://localhost:3100
INTERNAL_MANAGER_BOOTSTRAP_ADMIN_EMAIL=admin@tumiki.local
```

Auth.js / Desktop は Keycloak に直接接続せず、Jackson が発行した Web / Desktop 用 OIDC client を使います。Keycloak 側の OIDC client には Jackson callback URL（例: `http://localhost:3100/api/oauth/oidc`）を redirect URI として許可してください。

Infisical の `dev` 環境に別の OIDC 設定が入っている場合でも、ローカル Keycloak で起動するには以下を使います。`dev:keycloak` は `KEYCLOAK_INTERNAL_MANAGER_CLIENT_SECRET` を `TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_SECRET` として渡します。

```bash
cd apps/internal-manager
pnpm dev:keycloak
```

`3100` が別プロセスで使用中の場合は、ポートを指定できます。

```bash
PORT=3101 pnpm dev:keycloak
```

## テストアカウント

| メールアドレス     | パスワード | 用途                 |
| ------------------ | ---------- | -------------------- |
| admin@tumiki.local | admin123   | 管理者テストユーザー |

internal-manager 側では、空の DB に最初にログインしたユーザーが `SYSTEM_ADMIN` として作成されます。`dev:keycloak` では `INTERNAL_MANAGER_BOOTSTRAP_ADMIN_EMAIL=admin@tumiki.local` を設定するため、既存 DB に Dex 由来のユーザーが残っていても、`SYSTEM_ADMIN` がまだ存在しない場合に限り Keycloak の検証ユーザーを `SYSTEM_ADMIN` として作成できます。

`INTERNAL_MANAGER_BOOTSTRAP_ADMIN_EMAIL` はローカル検証用です。`development` / `test` かつ `SYSTEM_ADMIN` がまだ存在しない場合だけ昇格に使われます。Keycloak 検証後、継続利用しない環境では削除してください。

Keycloak 側でユーザーのグループを変更した場合、internal-manager のセッションには次回ログイン時の OIDC claim が反映されます。グループ同期を確認する場合は、一度サインアウトしてから再ログインしてください。

## SCIM の検証

Keycloak はこのローカル構成では OIDC provider として使います。internal-manager の SCIM 受け口を検証する場合は、管理画面で SCIM token を生成し、`/api/scim/v2/Users` と `/api/scim/v2/Groups` に Bearer token 付きでリクエストしてください。
