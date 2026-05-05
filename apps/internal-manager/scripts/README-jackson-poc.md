# saml-jackson POC セットアップ手順

[Phase 2: 認証・プロビジョニング 統合設計](https://docs.rayven.cloud/doc/phase-2-15ARZRLaxD) の POC 実施手順。

## 1. 環境変数の準備

Infisical の staging 環境に以下を追加:

```env
# DB 暗号化キー（32 文字以上、ランダム生成）
# 生成例: openssl rand -hex 32
JACKSON_ENCRYPTION_KEY=<32 文字以上のランダム文字列>

# OIDC ID Token 署名鍵（任意・指定なしなら jackson が自動生成）
# 生成例: openssl genrsa 2048
# JACKSON_OIDC_PRIVATE_KEY=<base64 RSA private key>
# JACKSON_OIDC_PUBLIC_KEY=<base64 RSA public key>
```

`JACKSON_ENCRYPTION_KEY` 生成コマンド:

```bash
openssl rand -hex 32
```

## 2. saml-jackson 用 PostgreSQL テーブルの自動生成

internal-manager を起動すると jackson が `INTERNAL_DATABASE_URL` の DB に必要なテーブルを自動生成する。手動 migration 不要。

確認方法:

```bash
# staging VM へ SSH
ssh -J lab-proxmox hisuzuya@10.11.0.14

# DB に接続して jackson のテーブルを確認
docker exec -it tumiki-db psql -U tumiki -d tumiki_internal -c "\dt jackson_*"
```

## 3. Google Workspace SAML メタデータの取得

Google 管理コンソール → アプリ → Web アプリとモバイルアプリ → Tumiki Internal Manager (SAML) → 「メタデータをダウンロード」

XML ファイルが取得できる（`GoogleIDPMetadata-rayven.cloud.xml` のような名前）。

## 4. SAML metadata を環境変数に設定

internal-manager は起動後、Google Workspace SAML metadata から Web 用と Desktop 用の Jackson OIDC client を自動生成する。手動で `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` を発行して Infisical に転記する必要はない。

```env
JACKSON_SAML_METADATA_XML=<GoogleIDPMetadata.xml の内容>
# または、ローカル検証のみ:
# JACKSON_SAML_METADATA_PATH=/path/to/GoogleIDPMetadata.xml
JACKSON_WEB_PRODUCT=tumiki
JACKSON_DESKTOP_PRODUCT=tumiki-desktop
JACKSON_DESKTOP_REDIRECT_URL=tumiki://auth/callback
```

自動生成された client は Jackson DB に保存され、Web ログインと `GET /api/auth/config` で利用される。

### Email account linking の許可条件

Auth.js は Jackson 経由のログインでも `allowDangerousEmailAccountLinking: false` のまま運用する。email が同じでも OIDC `sub` が一致しないアカウントは自動リンクしないため、IdP migration が必要な場合は `ExternalIdentity` を管理者フローまたは migration で明示的に移行する。

## 5. Google Workspace の SAML アプリを更新

Google 管理コンソール → Tumiki Internal Manager (SAML) → 「サービス プロバイダの詳細」を編集:

| 項目            | 値                                               |
| --------------- | ------------------------------------------------ |
| ACS URL         | `https://stg-internal.tumiki.cloud/api/saml/acs` |
| エンティティ ID | `https://stg-internal.tumiki.cloud`              |

属性マッピング:

| Google ディレクトリ属性 | アプリ属性  |
| ----------------------- | ----------- |
| Primary email           | `email`     |
| First name              | `firstName` |
| Last name               | `lastName`  |
| (任意) Group membership | `groups`    |

## 6. 再デプロイ

```bash
gh workflow run "Deploy Apps" --repo rayven122/tumiki --ref main -f environment=staging
```

## 7. 動作確認

### a. OIDC Discovery が応答するか

```bash
curl https://stg-internal.tumiki.cloud/.well-known/openid-configuration | jq .
```

期待される出力:

```json
{
  "issuer": "https://stg-internal.tumiki.cloud",
  "authorization_endpoint": "https://stg-internal.tumiki.cloud/api/oauth/authorize",
  "token_endpoint": "https://stg-internal.tumiki.cloud/api/oauth/token",
  "userinfo_endpoint": "https://stg-internal.tumiki.cloud/api/oauth/userinfo",
  "jwks_uri": "https://stg-internal.tumiki.cloud/.well-known/jwks.json",
  ...
}
```

### b. Desktop OIDC 設定が応答するか

```bash
curl https://stg-internal.tumiki.cloud/api/auth/config | jq .
```

`issuer` は internal-manager の URL、`clientId` は Jackson が自動生成した Desktop 用 clientID になる。

### c. Web ブラウザでログイン

[https://stg-internal.tumiki.cloud](https://stg-internal.tumiki.cloud) にアクセス → SSO ログインボタンをクリック → Google アカウントで認証 → internal-manager に戻る。

成功時:

- セッションが作成される
- `/admin/users` に自分が表示される
- session に Google から取得した `groups` 属性が含まれる

### d. ログ確認

```bash
ssh -J lab-proxmox hisuzuya@10.11.0.14
docker logs tumiki-internal-manager --tail=50 | grep -i jackson
```

`[jackson] info` で saml-jackson の動作ログが出る。

## 8. 補助スクリプト

通常は不要。ローカルで事前登録結果を確認したい場合だけ使用する。

ローカル（または staging VM）で:

```bash
cd apps/internal-manager

# 環境変数を読み込み（Infisical 経由）
infisical run --env=staging --domain=https://secrets.rayven.cloud -- \
  pnpm tsx scripts/jackson-register-connection.ts /path/to/GoogleIDPMetadata.xml
```

## 9. トラブルシュート

### saml-jackson 起動エラー

- `JACKSON_ENCRYPTION_KEY must be at least 32 characters long`: env を確認
- `INTERNAL_DATABASE_URL is required`: env を確認

### SAML 認証失敗

- ACS URL / Entity ID が一致しているか確認（Google 側とアプリ側）
- メタデータの SAML 証明書が有効か確認（期限切れ）
- Google 側の SAML アプリが ON になっているか

### OIDC Discovery が 404

- `next.config.js` の rewrites が正しく適用されているか
- アプリが再デプロイされているか

## 10. POC 完了後の削除手順（必要なら）

```bash
# saml-jackson のテーブル削除（ロールバック用）
docker exec -it tumiki-db psql -U tumiki -d tumiki_internal \
  -c "DROP TABLE IF EXISTS jackson_store, jackson_index, jackson_ttl CASCADE;"

# 環境変数を OIDC 直結に戻す場合は OIDC_* を設定し、JACKSON_SAML_METADATA_* を外す

# ブランチをロールバック
git revert <jackson POC のコミット>
```
