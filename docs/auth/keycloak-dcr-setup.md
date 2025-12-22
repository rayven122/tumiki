# Keycloak DCR（Dynamic Client Registration）設定ガイド

## 概要

DCR（Dynamic Client Registration）は、OAuth 2.0 クライアントをプログラムで登録するための仕組みです（RFC 7591）。

### アーキテクチャ

```
MCP Client → mcp-proxy → Keycloak
             POST /oauth/register   POST /clients-registrations/openid-connect
```

mcp-proxy は DCR リクエストを Keycloak にプロキシします。クライアント情報は Keycloak に保存されます。

## デフォルト設定での利用

### Keycloak 26.0 のデフォルト動作

**追加設定は不要です。** Keycloak 26.0 では DCR エンドポイントがデフォルトで有効になっています。

- **DCR エンドポイント**: `{KEYCLOAK_ISSUER}/clients-registrations/openid-connect`
- **自動検出**: OpenID Connect Discovery（`.well-known/openid-configuration`）の `registration_endpoint` に含まれる

### 動作確認

1. Keycloak が起動していることを確認:

```bash
# Docker で起動
pnpm docker:up
```

2. DCR エンドポイントの確認:

```bash
# OpenID Connect Discovery から registration_endpoint を確認
curl -s http://localhost:8443/realms/tumiki/.well-known/openid-configuration | jq .registration_endpoint
# 出力例: "http://localhost:8443/realms/tumiki/clients-registrations/openid-connect"
```

3. クライアント登録テスト:

```bash
# mcp-proxy 経由でクライアント登録
curl -X POST http://localhost:8080/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "redirect_uris": ["https://example.com/callback"],
    "client_name": "Test Client"
  }'
```

成功時のレスポンス例:

```json
{
  "client_id": "generated-client-id",
  "client_secret": "generated-secret",
  "redirect_uris": ["https://example.com/callback"],
  "client_name": "Test Client"
}
```

## セキュリティ強化（オプション）

デフォルトでは匿名での DCR が許可されています。本番環境ではセキュリティ強化を検討してください。

### Initial Access Token（IAT）による保護

IAT を使用すると、事前発行したトークンを持つリクエストのみが DCR を実行できます。

#### IAT の発行手順

1. Keycloak Admin Console にログイン: `http://localhost:8443/admin`
2. **Realm Settings** → **Client Registration** → **Initial Access Tokens** を選択
3. **Create** をクリック
4. 設定項目:
   - **Expiration**: トークンの有効期限（秒）
   - **Count**: このトークンで登録できるクライアント数
5. **Save** をクリックしてトークンをコピー

#### IAT を使用した DCR リクエスト

```bash
curl -X POST http://localhost:8080/oauth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <initial-access-token>" \
  -d '{
    "redirect_uris": ["https://example.com/callback"],
    "client_name": "Secure Client"
  }'
```

### Client Registration Policies

redirect_uri パターンやクライアントメタデータを制限できます。

#### 設定手順

1. Keycloak Admin Console にログイン
2. **Realm Settings** → **Client Registration** → **Client Registration Policies** を選択
3. ポリシーを追加:
   - **Trusted Hosts**: 許可するホストパターン
   - **Allowed Protocol Mappers**: 許可するプロトコルマッパー
   - **Allowed Client Scopes**: 許可するスコープ

## 環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `KEYCLOAK_ISSUER` | Keycloak Realm の URL | `http://localhost:8443/realms/tumiki` |
| `MCP_PROXY_URL` | mcp-proxy の公開 URL | `http://localhost:8080` |

## トラブルシューティング

### registration_endpoint が見つからない

**症状**: mcp-proxy が 501 エラーを返す

```json
{
  "error": "invalid_client_metadata",
  "error_description": "Server does not support Dynamic Client Registration"
}
```

**原因と対処**:
1. `KEYCLOAK_ISSUER` 環境変数が正しく設定されているか確認
2. Keycloak が起動しているか確認: `pnpm docker:ps`
3. OpenID Connect Discovery が正常か確認:
   ```bash
   curl -s ${KEYCLOAK_ISSUER}/.well-known/openid-configuration
   ```

### 認証エラー（401）

**症状**: Initial Access Token が必要なのに提供していない

```json
{
  "error": "invalid_client_metadata",
  "error_description": "Initial access token required"
}
```

**対処**:
- IAT が設定されている場合は、`Authorization: Bearer <token>` ヘッダーを追加
- IAT の有効期限が切れていないか確認
- IAT の使用回数上限に達していないか確認

### redirect_uri エラー（400）

**症状**: redirect_uri が無効

```json
{
  "error": "invalid_redirect_uri",
  "error_description": "redirect_uri must use HTTPS (except localhost)"
}
```

**対処**:
- HTTPS を使用する（localhost/127.0.0.1 は HTTP 許可）
- 有効な URL 形式であることを確認

### ログ確認

mcp-proxy のログで詳細を確認:

```bash
# Docker ログ
docker logs tumiki-mcp-proxy

# ローカル開発
pnpm --filter @tumiki/mcp-proxy dev
```

Keycloak のログ:

```bash
docker logs tumiki-keycloak
```

## 関連ドキュメント

- [Keycloak JWT Claims 設計](./keycloak-jwt-claims-design.md)
- [Keycloak 本番デプロイ](../deployment/keycloak.md)
- [RFC 7591 - OAuth 2.0 Dynamic Client Registration Protocol](https://datatracker.ietf.org/doc/html/rfc7591)
