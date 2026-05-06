# Internal Manager Jackson 認証設定

internal-manager は Auth.js / Desktop から見える OIDC IdP を Jackson に統一する。

```text
Auth.js / Desktop
  -> Jackson OIDC IdP
    -> upstream SAML IdP or upstream OIDC IdP
```

この構成では Auth.js / Desktop 用の `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` / `OIDC_DESKTOP_CLIENT_ID` を手動管理しない。Jackson が Web 用と Desktop 用の client を別々に発行し、`/api/auth/config` から Desktop 用 client ID を返す。

## 必須 env

全環境で必要:

| env                                        | 用途                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `TUMIKI_INTERNAL_MANAGER_SECRET_KEY`       | Auth.js secret と Jackson DB encryption key の導出元。32 文字以上。                                     |
| `TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY` | Jackson が ID Token に署名する PKCS8 private PEM を base64 化した値。public key は runtime で導出する。 |
| `TUMIKI_INTERNAL_MANAGER_PUBLIC_URL`       | Jackson issuer / SAML ACS / Auth.js callback URL の基準 URL。例: `https://stg-internal.tumiki.cloud`    |
| `INTERNAL_DATABASE_URL`                    | Jackson connection / token / session 保存用 DB。                                                        |

生成コマンド:

```bash
pnpm --filter @tumiki/internal-manager secrets:generate
```

## upstream が SAML の場合

Google Workspace SAML などを Jackson upstream として使う場合:

```env
TUMIKI_INTERNAL_MANAGER_SAML_METADATA_XML=<metadata xml>
# または
TUMIKI_INTERNAL_MANAGER_SAML_METADATA_PATH=/secure/path/metadata.xml
```

## upstream が OIDC の場合

Keycloak / Entra ID / Okta などの OIDC IdP を Jackson upstream として使う場合:

```env
TUMIKI_INTERNAL_MANAGER_OIDC_DISCOVERY_URL=https://idp.example.com/.well-known/openid-configuration
TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_ID=<upstream client id>
TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_SECRET=<upstream client secret>
```

`TUMIKI_INTERNAL_MANAGER_OIDC_DISCOVERY_URL` には issuer URL ではなく discovery document URL を設定する。互換用に旧 `OIDC_ISSUER` を読む場合だけ issuer URL から discovery URL へ補完する。

upstream 側の OIDC client には Jackson callback URL を許可する。

```text
{TUMIKI_INTERNAL_MANAGER_PUBLIC_URL}/api/oauth/oidc
```

## 任意 env

| env                            | デフォルト                    | 用途                                   |
| ------------------------------ | ----------------------------- | -------------------------------------- |
| `JACKSON_TENANT`               | `default`                     | Jackson connection の tenant。         |
| `JACKSON_WEB_PRODUCT`          | `JACKSON_PRODUCT` or `tumiki` | Web/Auth.js 用 connection の product。 |
| `JACKSON_DESKTOP_PRODUCT`      | `<web-product>-desktop`       | Desktop 用 connection の product。     |
| `JACKSON_DESKTOP_REDIRECT_URL` | `tumiki://auth/callback`      | Desktop の redirect URI。              |

## 旧 env との扱い

新規設定では以下を使わない。

既存環境で `OIDC_ISSUER` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` を Auth.js 直結用に設定していた場合、この PR 以降は Jackson upstream OIDC の互換 fallback として扱われる。つまり認証フローは `Auth.js -> upstream IdP` 直結ではなく `Auth.js -> Jackson -> upstream IdP` になる。移行時は `TUMIKI_INTERNAL_MANAGER_SECRET_KEY` / `TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY` / `TUMIKI_INTERNAL_MANAGER_PUBLIC_URL` を追加し、upstream 設定名も `TUMIKI_INTERNAL_MANAGER_OIDC_*` に置き換える。既存 `OIDC_*` を残したままデプロイすると Jackson 経由へ切り替わるため、staging で callback URL と発行 client を確認してから prod へ反映する。

| 旧 env                                                     | 扱い                                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `AUTH_SECRET` / `NEXTAUTH_SECRET`                          | 互換 fallback。通常は `TUMIKI_INTERNAL_MANAGER_SECRET_KEY` から導出する。                              |
| `JACKSON_ENCRYPTION_KEY`                                   | 互換 fallback。通常は `TUMIKI_INTERNAL_MANAGER_SECRET_KEY` から導出する。                              |
| `JACKSON_OIDC_PRIVATE_KEY` / `JACKSON_OIDC_PUBLIC_KEY`     | 互換 fallback。通常は `TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY` だけを設定し、public key は導出する。 |
| `JACKSON_SAML_METADATA_XML` / `JACKSON_SAML_METADATA_PATH` | 互換 fallback。新規は `TUMIKI_INTERNAL_MANAGER_SAML_METADATA_*` を使う。                               |
| `OIDC_ISSUER` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET`    | 互換 fallback。Auth.js 直結ではなく Jackson upstream OIDC として扱う。                                 |
| `OIDC_DESKTOP_CLIENT_ID`                                   | 不要。Desktop 用 client は Jackson が発行する。                                                        |
| `NEXTAUTH_URL_INTERNAL_MANAGER` / `NEXTAUTH_URL`           | URL 解決の互換 fallback。新規は `TUMIKI_INTERNAL_MANAGER_PUBLIC_URL` を使う。                          |

## 環境別の設定

### local

ローカル Keycloak を upstream OIDC として使う。

```env
TUMIKI_INTERNAL_MANAGER_PUBLIC_URL=http://localhost:3100
TUMIKI_INTERNAL_MANAGER_OIDC_DISCOVERY_URL=http://localhost:8888/realms/tumiki/.well-known/openid-configuration
TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_ID=tumiki-internal-manager
TUMIKI_INTERNAL_MANAGER_OIDC_CLIENT_SECRET=<KEYCLOAK_INTERNAL_MANAGER_CLIENT_SECRET>
```

`pnpm --filter @tumiki/internal-manager dev:keycloak` は上記の OIDC upstream env を渡す。

### staging

Infisical `staging` に共通必須 env と、SAML / OIDC upstream のどちらか一式を登録する。

`docker/apps/compose.yaml` は Infisical から取得した `.env` をそのまま internal-manager container に渡す。`TUMIKI_INTERNAL_MANAGER_PUBLIC_URL` は `.env` 側で明示する。

### production

Infisical `prod` も staging と同じ env 形に揃える。`TUMIKI_INTERNAL_MANAGER_SECRET_KEY` と `TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY` は staging とは別値にする。

## GitHub Actions / deploy 影響

確認済み:

- `.github/workflows/deploy-apps.yml` は Infisical から `.env` を取得して VM に転送するだけで、認証 env 名を直書きしていない。
- `docker/apps/compose.yaml` は `env_file: .env` で internal-manager に env を渡す。`NEXTAUTH_URL` 上書きは互換用に残すが、Jackson の基準 URL は `TUMIKI_INTERNAL_MANAGER_PUBLIC_URL`。
- `.github/workflows/docker-publish.yml` は Docker image build/push のみで、runtime secret 名への依存はない。
- `.github/workflows/ci.yml` の Docker smoke test は新しい `TUMIKI_INTERNAL_MANAGER_*` dummy env に更新済み。

デプロイ前チェック:

1. Infisical `staging` / `prod` に `TUMIKI_INTERNAL_MANAGER_SECRET_KEY` と `TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY` がある。
2. `TUMIKI_INTERNAL_MANAGER_PUBLIC_URL` が対象環境の public URL と一致している。
3. SAML upstream と OIDC upstream を同時に設定していない。
4. OIDC upstream の場合、IdP client の redirect URI に `{TUMIKI_INTERNAL_MANAGER_PUBLIC_URL}/api/oauth/oidc` が登録されている。
5. Desktop 用 redirect URI は `JACKSON_DESKTOP_REDIRECT_URL`、未設定なら `tumiki://auth/callback`。
