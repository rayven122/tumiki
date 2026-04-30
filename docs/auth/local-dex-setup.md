# ローカル開発: Dex を使った SSO セットアップ

ローカル環境では、組み込みの [Dex](https://dexidp.io/) OIDC プロバイダーを使用して認証を検証します。

## 起動

```bash
pnpm docker:up
```

Dex は `http://localhost:5556/dex` で起動します。

## 環境変数（internal-manager）

Infisical の `dev` 環境に設定済みです。手動で設定する場合は以下を使用してください。

```env
OIDC_ISSUER=http://localhost:5556/dex
OIDC_CLIENT_ID=tumiki-internal
OIDC_CLIENT_SECRET=tumiki-secret
OIDC_DESKTOP_CLIENT_ID=tumiki-desktop
```

## テストアカウント

| メールアドレス | パスワード | 用途 |
|---|---|---|
| admin@example.com | password | 管理者 |
| user@example.com | password | 一般ユーザー |

## Desktop アプリとの連携

Desktop アプリは PKCE フローで Dex に接続します。設定変更は不要です。

**認証フロー:**

1. Desktop の設定画面で管理サーバー URL（`http://localhost:3100`）を入力して接続
2. 「Manager 連携」の「ログイン」ボタンをクリック
3. ブラウザが開き、Dex のログイン画面が表示される
4. テストアカウントでログイン
5. `tumiki://auth/callback` にリダイレクトされ、Desktop が認証完了を検知

## Dex の設定変更

`docker/dex/config.yaml` を編集後、コンテナを再起動します。

```bash
docker compose -f docker/local/compose.yaml restart dex
```

クライアントの追加・変更は `staticClients` セクションで行います。
