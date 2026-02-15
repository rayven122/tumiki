# MCPプロキシサーバーの認証アーキテクチャ

## 現在の認証フロー

### エントリーポイント
- `apps/mcp-proxy/src/routes/mcp.ts`: `/mcp/:mcpServerId` エンドポイント
- `integratedAuthMiddleware` を適用してリクエストを認証

### 認証ミドルウェア（`apps/mcp-proxy/src/middleware/auth/index.ts`）

1. **detectAuthType**: ヘッダーから認証タイプを判定
   - `Bearer eyJ...` → JWT認証
   - `Bearer tumiki_...` または `X-API-Key` → APIキー認証
   - なし → 401エラー

2. **authenticateWithJWT**: JWT認証を実行
   - `devKeycloakAuth` でトークン検証
   - `jwtPayload.tumiki.mcp_instance_id` を必須チェック
   - `checkPermission` で権限確認

3. **apiKeyAuthMiddleware**: APIキー認証を実行
   - DB から `mcpApiKey` を検索
   - 有効性チェック

### 問題点
- **authTypeを見ていない**: `McpServer.authType` を全く使用していない
- **常に認証要求**: リモートMCPサーバーの認証タイプに関係なく認証を要求
- **誤った認証許可**: `authType=OAUTH`のサーバーにAPIキーでアクセス可能

## データベーススキーマ

### McpServer（`packages/db/prisma/schema/userMcpServer.prisma`）
- `authType`: AuthType（NONE, API_KEY, OAUTH）
- 実際に稼働するMCPサーバーインスタンス
- 複数の`McpServerTemplate`を使用可能

### McpServerTemplate（`packages/db/prisma/schema/mcpServer.prisma`）
- `authType`: リモートMCPサーバーへの認証タイプ
- OAuth/APIキーのヘッダー注入に使用（`oauth-header-injector.ts`）

### 重要な区別
1. **プロキシ認証**: クライアント → MCPプロキシ（`McpServer.authType`で制御すべき）
2. **リモート認証**: MCPプロキシ → リモートMCPサーバー（`McpServerTemplate.authType`で制御済み）

## キャッシュ機構

### Redis キャッシュ（`apps/mcp-proxy/src/libs/cache/configCache.ts`）
- キーフォーマット: `mcp:config:{mcpServerId}`
- TTL: 300秒（5分）
- データ暗号化: `encrypt()/decrypt()` 使用
- キャッシュ内容: `RemoteMcpServerConfig[]`（リモートサーバー設定のみ）

### 現在のキャッシュデータ構造
```typescript
type CachedConfigData = Array<{
  namespace: string;
  config: RemoteMcpServerConfig;
}>;
```

## 認証の使用箇所

### プロキシ認証（未実装）
- `integratedAuthMiddleware`: 現在は常に認証要求

### リモート認証（実装済み）
- `oauth-header-injector.ts`: `McpServerTemplate.authType`に基づいてヘッダー注入
- `OAUTH`: OAuth トークン取得 + `Authorization: Bearer` 注入
- `API_KEY`: envVars から APIキー取得 + ヘッダー注入
- `NONE`: ヘッダー注入なし

## DEV_MODE 動作

### 認証バイパス（`apps/mcp-proxy/src/middleware/auth/jwt.ts`）
条件:
1. `NODE_ENV === "development"`
2. ホスト名が `127.0.0.1` または `localhost`
3. `ENABLE_AUTH_BYPASS === "true"`
4. `DEV_MODE === "true"`
5. `FORCE_AUTH !== "true"`

ダミーペイロード設定:
```typescript
{
  sub: "dev-user-id",
  tumiki: {
    org_id: "dev-org-id",
    is_org_admin: true,
    tumiki_user_id: "dev-user-db-id",
    mcp_instance_id: "dev-mcp-instance-id",
  }
}
```

### 固定サーバー設定（`apps/mcp-proxy/src/services/config/configService.ts`）
`DEV_MODE === "true"` の場合:
```typescript
[{
  namespace: "context7",
  config: {
    enabled: true,
    name: "Context7 (Dev Mode)",
    url: "https://mcp.context7.com/mcp",
    transportType: "http",
    authType: "none",
  }
}]
```
