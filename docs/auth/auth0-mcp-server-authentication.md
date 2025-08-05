# Auth0認証実装計画 - Tumiki Proxy Server

## 概要

既存のTumiki Proxy ServerにAuth0認証を統合する最小限の実装計画です。`express-oauth2-jwt-bearer`ライブラリのみを使用し、既存のAPIキー認証と共存させながら段階的に移行します。

## 実装ステップ

### 1. 依存関係の追加

```bash
pnpm add express-oauth2-jwt-bearer --filter @tumiki/proxy-server
```

### 2. 環境変数の設定

`.env`ファイルに以下を追加：

```env
# Auth0設定
AUTH0_AUDIENCE=https://api.tumiki.cloud
AUTH0_ISSUER_BASE_URL=https://tumiki.jp.auth0.com
AUTH0_M2M_DOMAIN=tumiki.jp.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
```

### 3. JWT検証ミドルウェアの作成

`apps/proxyServer/src/middleware/auth.ts`:

- express-oauth2-jwt-bearerを使用したJWT検証
- APIキー認証との互換性維持（段階的移行）
- 認証方式の自動判定（Bearer token vs API key）

### 4. OAuthディスカバリーエンドポイント

`apps/proxyServer/src/routes/oauth/index.ts`:

- `/.well-known/oauth-authorization-server`エンドポイント
- Auth0設定情報の公開

### 5. 既存ルートへの統合

`apps/proxyServer/src/routes/mcp/index.ts`の改修:

- JWT認証ミドルウェアの追加
- 認証情報のセッション管理への受け渡し
- 後方互換性の維持

### 6. セッション管理の拡張

`apps/proxyServer/src/utils/session.ts`の改修:

- 認証コンテキスト（authInfo）の追加
- ユーザー情報とセッションの紐付け

### 7. エラーハンドリング

`apps/proxyServer/src/middleware/errorHandler.ts`:

- 認証エラーの適切な処理（401/403）
- WWW-Authenticateヘッダーの設定

### 8. テストスクリプト

`apps/proxyServer/scripts/test-auth0.ts`:

- M2Mトークン取得
- 認証付きMCP接続テスト

### 9. ドキュメント更新

- README.mdへの認証設定手順追加
- 移行ガイドの作成

## 実装の特徴

### 最小限のコード変更

- 既存のAPIキー認証を維持
- 新規追加は約100行程度
- 段階的移行が可能

### セキュリティ考慮事項

- RS256アルゴリズムによる署名検証
- Auth0公開鍵の自動取得・キャッシュ
- トークン有効期限の自動チェック

### 互換性

- 既存クライアントは影響なし
- 新規クライアントから順次JWT認証へ移行
- APIキーとJWT両方のサポート

## 移行戦略

1. **Phase 1**: JWT認証の追加（APIキーと共存）
2. **Phase 2**: 新規クライアントはJWT認証を使用
3. **Phase 3**: 既存クライアントの段階的移行
4. **Phase 4**: APIキー認証の廃止（オプション）

## 実装詳細

### JWT検証ミドルウェア実装例

```typescript
// apps/proxyServer/src/middleware/auth.ts
import { auth } from "express-oauth2-jwt-bearer";
import { Request, Response, NextFunction } from "express";

// JWT検証設定
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || `https://${process.env.AUTH0_M2M_DOMAIN}`,
  tokenSigningAlg: "RS256",
});

// 統合認証ミドルウェア
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  // Bearer tokenが存在する場合はJWT認証
  if (authHeader?.startsWith("Bearer ")) {
    return checkJwt(req, res, next);
  }

  // APIキー認証（後方互換性）
  const apiKey = req.query["api-key"] || req.headers["api-key"];
  if (apiKey) {
    // 既存のAPIキー検証ロジック
    // ...
    return next();
  }

  // 認証なし
  res.status(401).json({
    jsonrpc: "2.0",
    error: {
      code: -32001,
      message: "認証が必要です",
    },
  });
};
```

### セッション管理の拡張例

```typescript
// apps/proxyServer/src/utils/session.ts
export interface AuthInfo {
  sub: string; // ユーザーID
  scope?: string; // スコープ
  permissions?: string[]; // 権限リスト
  email?: string; // メールアドレス
  roles?: string[]; // ロール
}

export interface MCPSession {
  id: string;
  transport: StreamableHttpServerTransport;
  authInfo?: AuthInfo; // 認証情報を追加
  createdAt: Date;
  lastAccessedAt: Date;
}
```

## テスト方法

### 1. ローカル環境でのテスト

```bash
# サーバー起動
pnpm dev --filter @tumiki/proxy-server

# 認証なしでアクセス（401エラー確認）
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# M2Mトークンでテスト
AUTH0_CLIENT_ID=your_client_id AUTH0_CLIENT_SECRET=your_client_secret pnpm test:auth0 --filter @tumiki/proxy-server
```

### 2. Auth0設定確認

1. Auth0ダッシュボードでAPIを作成
2. M2Mアプリケーションを作成
3. 適切なスコープ/権限を設定
4. 環境変数に認証情報を設定

## トラブルシューティング

### よくある問題と解決方法

1. **JWT検証エラー**
   - Auth0設定の確認
   - audience/issuerの一致確認
   - トークンの有効期限確認

2. **権限不足エラー**
   - トークンのスコープ確認
   - Auth0でのロール/権限設定確認

3. **セッション管理の問題**
   - セッションタイムアウト設定
   - メモリ使用量の監視

## 関連ドキュメント

- [Auth0公式ドキュメント](https://auth0.com/docs)
- [express-oauth2-jwt-bearer](https://github.com/auth0/express-oauth2-jwt-bearer)
- [MCP仕様書](https://spec.modelcontextprotocol.io/)
