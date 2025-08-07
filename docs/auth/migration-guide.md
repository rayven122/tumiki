# Tumiki Proxy Server 認証移行ガイド

## 概要

このガイドでは、Tumiki Proxy Serverの旧エンドポイントから新しいRESTfulエンドポイントへの移行、およびAPIキー認証からOAuth認証への移行方法について説明します。

## 移行の種類

### 1. エンドポイントの移行（推奨）

レガシーエンドポイントから新しいRESTfulエンドポイントへの移行

### 2. 認証方式の移行（オプション）

APIキー認証からOAuth2.0認証への移行

## エンドポイント移行ガイド

### なぜ移行するのか

新しいRESTfulエンドポイントには以下の利点があります：

- **明示的なリソース指定**: URLパスでMCPサーバーインスタンスIDを直接指定
- **RESTful設計**: 標準的なREST APIパターンに準拠
- **認証の柔軟性**: authTypeに基づく複数の認証方式のサポート
- **パフォーマンス**: APIキーからMCPサーバーIDを解決する処理が不要

### 移行前後の比較

#### Streamable HTTP Transport

**Before（レガシー）:**

```bash
# APIキーからMCPサーバーを特定
curl -X POST http://localhost:8080/mcp?api-key=your_api_key \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

**After（新RESTful）:**

```bash
# URLパスでMCPサーバーIDを直接指定
curl -X POST http://localhost:8080/mcp/{mcpServerInstanceId} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

#### SSE Transport

**Before（レガシー）:**

```bash
# SSE接続確立
curl -N http://localhost:8080/sse?api-key=your_api_key

# メッセージ送信
curl -X POST http://localhost:8080/messages?api-key=your_api_key \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"session-123","message":"..."}'
```

**After（新RESTful）:**

```bash
# SSE接続確立
curl -N http://localhost:8080/sse/{mcpServerInstanceId} \
  -H "X-API-Key: your_api_key"

# メッセージ送信
curl -X POST http://localhost:8080/messages/{mcpServerInstanceId} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{"sessionId":"session-123","message":"..."}'
```

### 移行手順

#### Step 1: MCPサーバーインスタンスIDの取得

データベースまたは管理画面から、使用するMCPサーバーのインスタンスIDを取得します。

#### Step 2: エンドポイントURLの更新

```javascript
// Before
const MCP_ENDPOINT = "http://localhost:8080/mcp";
const API_KEY = "your_api_key";

// After
const MCP_SERVER_ID = "your_mcp_server_instance_id";
const MCP_ENDPOINT = `http://localhost:8080/mcp/${MCP_SERVER_ID}`;
const API_KEY = "your_api_key";
```

#### Step 3: 認証ヘッダーの更新

```javascript
// Before
const headers = {
  "Content-Type": "application/json",
  "api-key": API_KEY, // または URLパラメータ ?api-key=
};

// After
const headers = {
  "Content-Type": "application/json",
  "X-API-Key": API_KEY, // 推奨ヘッダー形式
};
```

#### Step 4: テストと検証

1. 新しいエンドポイントでの接続テスト
2. 既存機能の動作確認
3. エラーハンドリングの確認

## 認証方式の移行（APIキー → OAuth）

### 前提条件

1. Auth0アカウントとテナントの設定
2. M2M（Machine-to-Machine）アプリケーションの作成
3. 適切なAPIの設定とスコープの定義

### 移行手順

#### Step 1: Auth0でのM2Mアプリケーション作成

1. Auth0ダッシュボードにログイン
2. Applications → Create Application
3. "Machine to Machine Applications"を選択
4. APIを選択し、必要なスコープを付与

#### Step 2: 環境変数の設定

```env
# Auth0設定
AUTH0_DOMAIN=your-auth0-domain.com
AUTH0_M2M_DOMAIN=your-tenant.auth0.com
AUTH0_M2M_CLIENT_ID=your-m2m-client-id
AUTH0_M2M_CLIENT_SECRET=your-m2m-client-secret
```

#### Step 3: データベースでauthTypeを更新

```sql
-- MCPサーバーインスタンスの認証タイプをOAUTHに変更
UPDATE UserMcpServerInstance
SET authType = 'OAUTH'
WHERE id = 'your_mcp_server_instance_id';
```

#### Step 4: トークン取得処理の実装

```javascript
// M2Mトークンを取得する関数
async function getM2MToken() {
  const response = await fetch(`https://${AUTH0_M2M_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: AUTH0_M2M_CLIENT_ID,
      client_secret: AUTH0_M2M_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api`,
      grant_type: "client_credentials",
    }),
  });

  const data = await response.json();
  return data.access_token;
}

// 使用例
const token = await getM2MToken();
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};
```

#### Step 5: リクエストの更新

```javascript
// Before（APIキー認証）
const response = await fetch(`${MCP_ENDPOINT}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  },
  body: JSON.stringify(requestData),
});

// After（OAuth認証）
const token = await getM2MToken();
const response = await fetch(`${MCP_ENDPOINT}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(requestData),
});
```

## 段階的移行戦略

### Phase 1: 準備（1-2週間）

1. 新エンドポイントのテスト環境での検証
2. Auth0設定の準備（OAuth移行の場合）
3. クライアントコードの更新準備

### Phase 2: 並行運用（2-4週間）

1. 新旧両方のエンドポイントを並行稼働
2. 新規接続は新エンドポイントを使用
3. 既存接続は徐々に移行

### Phase 3: 切り替え（1週間）

1. すべてのクライアントを新エンドポイントに移行
2. 旧エンドポイントへのアクセス監視
3. 問題がないことを確認

### Phase 4: 完了

1. 旧エンドポイントの非推奨化アナウンス
2. 移行完了の確認
3. ドキュメントの更新

## トラブルシューティング

### よくある問題と解決方法

#### 1. 401 Unauthorized エラー

**原因**: 認証情報が正しくない、またはauthTypeと一致しない

**解決方法**:

- authTypeの設定を確認
- APIキーまたはBearer tokenが正しいか確認
- ヘッダー名が正しいか確認（X-API-Key vs Authorization）

#### 2. 404 Not Found エラー

**原因**: MCPサーバーインスタンスIDが間違っている

**解決方法**:

- URLパスのMCPサーバーインスタンスIDを確認
- データベースでインスタンスが存在することを確認

#### 3. 501 Not Implemented エラー

**原因**: authType="BOTH"が設定されている

**解決方法**:

- authTypeをAPI_KEYまたはOAUTHに変更

#### 4. 403 Forbidden エラー

**原因**: authType="NONE"が設定されている

**解決方法**:

- authTypeをAPI_KEYまたはOAUTHに設定

## ベストプラクティス

### セキュリティ

1. **本番環境ではOAuth認証を推奨**
   - より強固なセキュリティ
   - トークンの有効期限管理
   - 細かいスコープ制御

2. **APIキーの管理**
   - 環境変数での管理
   - 定期的なローテーション
   - 最小権限の原則

### パフォーマンス

1. **新RESTfulエンドポイントの使用**
   - APIキー解決のオーバーヘッドを削減
   - 直接的なリソースアクセス

2. **トークンのキャッシュ**
   - M2Mトークンは有効期限までキャッシュ
   - 不要なトークン取得を避ける

### 監視

1. **エラー率の監視**
   - 認証エラーの追跡
   - 移行前後での比較

2. **レスポンスタイムの監視**
   - エンドポイント別のパフォーマンス
   - 認証方式別の違い

## サポート

移行に関する質問やサポートが必要な場合は、以下までお問い合わせください：

- ドキュメント: https://docs.tumiki.cloud/auth
- GitHub Issues: https://github.com/tumiki/proxy-server/issues
- サポートメール: support@tumiki.cloud

## 関連ドキュメント

- [Auth0認証実装ガイド](./auth0-mcp-server-authentication.md)
- [Proxy Server README](../../apps/proxyServer/README.md)
- [MCP仕様書](https://spec.modelcontextprotocol.io/)
