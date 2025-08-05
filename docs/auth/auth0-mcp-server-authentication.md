# Auth0認証実装ガイド - Tumiki Proxy Server

## 概要

Tumiki Proxy ServerにおけるAuth0認証の実装状況と今後の実装計画です。`express-oauth2-jwt-bearer`ライブラリを使用し、既存のAPIキー認証と共存させながら段階的に移行します。

## 現在の実装状況

### ✅ 実装済み

1. **条件付きOAuth認証ミドルウェア** (`apps/proxyServer/src/middleware/auth.ts`)
   - クエリパラメータ（`useOAuth=true` または `use_oauth=true`）による条件付き認証
   - JWT検証の実装（RS256アルゴリズム）
   - エラーハンドリングとログ出力

2. **環境変数の設定** (`.env`)
   - `AUTH0_DOMAIN`: Auth0カスタムドメイン
   - `AUTH0_M2M_DOMAIN`: Machine-to-Machineドメイン
   - 複数のAuth0クライアント設定（ログイン用、OAuth用、M2M用）

3. **ミドルウェアの統合** (`apps/proxyServer/src/index.ts`)
   - すべてのMCPエンドポイントに条件付き認証を適用
   - CORS設定でAuthorizationヘッダーを許可

4. **AuthType列挙型の定義** (`packages/db/prisma/schema/mcpServer.prisma`)
   - `NONE`: 認証不要
   - `API_KEY`: APIキー認証
   - `OAUTH`: OAuth認証
   - `BOTH`: APIキーとOAuth両方を許可

### ❌ 未実装

1. **AuthTypeに基づく認証制御**
   - UserMcpServerInstanceのauthTypeフィールドに基づく認証方式の選択
   - OAUTHまたはBOTHの場合のみBearer token検証を実行
   - APIキー検証後のauthType確認処理

2. **OAuthディスカバリーエンドポイント**
   - `/.well-known/oauth-authorization-server`エンドポイント
   - Auth0設定情報の公開

3. **セッション管理への認証情報統合**
   - AuthInfo型の定義とセッションへの統合
   - ユーザー情報とセッションの紐付け

4. **APIキー認証との統合**
   - 現在は別々に処理（APIキー認証が優先）
   - 統合認証ミドルウェアの実装

5. **テストスクリプト**
   - M2Mトークン取得スクリプト
   - 認証付きMCP接続テスト

## 実装ステップ

### 1. 依存関係の追加

```bash
pnpm add express-oauth2-jwt-bearer --filter @tumiki/proxy-server
```

### 2. 環境変数の設定

`.env`ファイルに以下を追加：

```env
# Auth0設定（実装済み）
AUTH0_DOMAIN=  # Auth0カスタムドメイン
AUTH0_M2M_DOMAIN=  # Auth0 M2Mドメイン

# ログイン用の設定
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# OAuth認証用の設定
AUTH0_OAUTH_CLIENT_ID=
AUTH0_OAUTH_CLIENT_SECRET=

# Auth0 Machine-to-Machine (M2M) Client
AUTH0_M2M_CLIENT_ID=
AUTH0_M2M_CLIENT_SECRET=
```

### 3. JWT検証ミドルウェアの作成（実装済み）

`apps/proxyServer/src/middleware/auth.ts`:

- ✅ express-oauth2-jwt-bearerを使用したJWT検証
- ✅ 条件付き認証（クエリパラメータによる制御）
- ❌ APIキー認証との統合（現在は別々に処理）

### 4. OAuthディスカバリーエンドポイント（未実装）

`apps/proxyServer/src/routes/oauth/index.ts`:

- ❌ `/.well-known/oauth-authorization-server`エンドポイント
- ❌ Auth0設定情報の公開

### 5. 既存ルートへの統合（部分的に実装済み）

`apps/proxyServer/src/index.ts`:

- ✅ 条件付きJWT認証ミドルウェアの追加
- ❌ 認証情報のセッション管理への受け渡し
- ✅ 後方互換性の維持（クエリパラメータで制御）

### 6. セッション管理の拡張（未実装）

`apps/proxyServer/src/utils/session.ts`の改修:

- ❌ 認証コンテキスト（authInfo）の追加
- ❌ ユーザー情報とセッションの紐付け

### 7. エラーハンドリング（部分的に実装済み）

`apps/proxyServer/src/middleware/auth.ts`:

- ✅ 認証エラーの適切な処理（401）
- ❌ WWW-Authenticateヘッダーの設定

### 8. テストスクリプト（未実装）

`apps/proxyServer/scripts/test-auth0.ts`:

- ❌ M2Mトークン取得
- ❌ 認証付きMCP接続テスト

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

### 現在の実装（conditionalAuthMiddleware）

```typescript
// apps/proxyServer/src/middleware/auth.ts
import { type Request, type Response, type NextFunction } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { logger } from "../libs/logger.js";

/**
 * JWT検証ミドルウェアの設定
 */
const jwtCheck = auth({
  audience: `https://${process.env.AUTH0_DOMAIN || ""}/api`,
  issuerBaseURL: `https://${process.env.AUTH0_M2M_DOMAIN || ""}/`,
  tokenSigningAlg: "RS256",
});

/**
 * 条件付きOAuth認証ミドルウェア
 * 特定のクエリパラメータが存在する場合のみJWT検証を実行
 */
export const conditionalAuthMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // クエリパラメータをチェック
    const useOAuth =
      req.query.useOAuth === "true" || req.query.use_oauth === "true";

    if (!useOAuth) {
      // OAuth認証を使用しない場合はスキップ
      return next();
    }

    logger.info("OAuth validation requested", {
      path: req.path,
      method: req.method,
      clientId: req.headers["x-client-id"] || req.ip,
    });

    // jwtCheckを直接呼び出す
    jwtCheck(req, res, (err?: unknown) => {
      if (err) {
        logger.error("OAuth validation failed", {
          path: req.path,
          error: err instanceof Error ? err.message : "JWT validation failed",
        });

        // エラーレスポンスが既に送信されていない場合のみ送信
        if (!res.headersSent) {
          res.status(401).json({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message: "Unauthorized: Invalid or missing OAuth token",
            },
            id: null,
          });
        }
      } else {
        // 認証成功のログ
        logger.info("OAuth validation successful", {
          path: req.path,
        });
        next();
      }
    });
  };
};
```

### 今後実装予定：セッション管理の拡張

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

### 今後実装予定：統合認証ミドルウェア

```typescript
// apps/proxyServer/src/middleware/auth.ts
// APIキー認証とJWT認証を統合したミドルウェアの実装
// UserMcpServerInstanceのauthTypeに基づいて認証方式を選択

export const integratedAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.query["api-key"] || req.headers["api-key"];
  const authHeader = req.headers.authorization;
  
  // APIキーで認証情報を取得
  if (apiKey) {
    const validation = await validateApiKey(apiKey);
    if (!validation.valid || !validation.userMcpServerInstance) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    
    const authType = validation.userMcpServerInstance.authType;
    
    // authTypeに基づく認証チェック
    switch (authType) {
      case "NONE":
        // 認証不要
        return next();
        
      case "API_KEY":
        // APIキーのみ（既に検証済み）
        return next();
        
      case "OAUTH":
        // OAuthのみ - Bearer tokenが必須
        if (!authHeader?.startsWith("Bearer ")) {
          return res.status(401).json({ 
            error: "OAuth authentication required for this server" 
          });
        }
        // JWT検証を実行
        return jwtCheck(req, res, next);
        
      case "BOTH":
        // APIキーまたはOAuth
        if (authHeader?.startsWith("Bearer ")) {
          // Bearer tokenがある場合はJWT検証
          return jwtCheck(req, res, next);
        }
        // APIキーで既に認証済み
        return next();
    }
  }
  
  // APIキーがない場合はBearer tokenをチェック
  if (authHeader?.startsWith("Bearer ")) {
    // TODO: Bearer tokenからMCPサーバー情報を取得する実装
    return jwtCheck(req, res, next);
  }
  
  // 認証情報なし
  res.status(401).json({ error: "Authentication required" });
};
```

## テスト方法

### 1. ローカル環境でのテスト（現在の実装）

```bash
# サーバー起動
pnpm dev --filter @tumiki/proxy-server

# APIキー認証でアクセス（既存の方法）
curl -X POST http://localhost:8080/mcp?api-key=your_api_key \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# OAuth認証でアクセス（useOAuthパラメータ使用）
# 事前にM2Mトークンを取得しておく必要があります
curl -X POST "http://localhost:8080/mcp?useOAuth=true" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_M2M_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# OAuth認証なしでuseOAuth=trueを指定（401エラー確認）
curl -X POST "http://localhost:8080/mcp?useOAuth=true" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### 1.5. AuthTypeベースのテスト（今後実装予定）

```bash
# authType = API_KEY の場合
curl -X POST http://localhost:8080/mcp?api-key=your_api_key \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# authType = OAUTH の場合（APIキーは無効）
curl -X POST http://localhost:8080/mcp?api-key=your_api_key \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
# → 401エラー: OAuth認証が必要

# authType = OAUTH の場合（Bearer tokenで成功）
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_M2M_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# authType = BOTH の場合（APIキーとBearer token両方可）
# APIキーでアクセス
curl -X POST http://localhost:8080/mcp?api-key=your_api_key \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Bearer tokenでアクセス
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_M2M_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# authType = NONE の場合（認証不要）
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### 2. M2Mトークンの取得方法（手動）

```bash
# Auth0からM2Mトークンを取得
curl -X POST https://YOUR_AUTH0_M2M_DOMAIN/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "YOUR_M2M_CLIENT_ID",
    "client_secret": "YOUR_M2M_CLIENT_SECRET",
    "audience": "https://YOUR_AUTH0_DOMAIN/api",
    "grant_type": "client_credentials"
  }'
```

### 3. Auth0設定確認

1. Auth0ダッシュボードでAPIを作成
   - Identifier: `https://auth.tumiki.cloud/api`
   - Signing Algorithm: RS256
2. M2Mアプリケーションを作成
   - アプリケーション名: Tumiki MCP M2M
   - 対象API: 上記で作成したAPI
3. 適切なスコープ/権限を設定
4. 環境変数に認証情報を設定（実装済み）

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

## 今後の実装計画

### Phase 1: 基本機能の完成（優先度: 高）

1. **AuthTypeに基づく認証制御の実装**
   - APIキー検証時にUserMcpServerInstanceのauthTypeを確認
   - authTypeに応じた認証方式の適用:
     - `NONE`: 認証チェックをスキップ
     - `API_KEY`: APIキーのみ検証
     - `OAUTH`: Bearer tokenのみ検証（APIキーは無効）
     - `BOTH`: APIキーまたはBearer tokenを検証
   - エラーメッセージをauthTypeに応じて適切に返す

2. **統合認証ミドルウェアの実装**
   - APIキー認証とJWT認証の統合
   - authTypeフィールドに基づく動的な認証方式選択
   - 認証情報の統一的な管理

3. **セッション管理の拡張**
   - AuthInfo型の実装
   - セッションに認証情報を紐付け
   - ユーザーごとの利用制限管理

### Phase 2: 開発体験の向上（優先度: 中）

1. **テストスクリプトの作成**
   - M2Mトークン自動取得スクリプト
   - 各authTypeでの認証テスト
   - CI/CDパイプラインへの組み込み

2. **OAuthディスカバリーエンドポイント**
   - `/.well-known/oauth-authorization-server`の実装
   - Auth0設定情報の公開
   - クライアントの自動設定支援

### Phase 3: 本番展開（優先度: 低）

1. **既存クライアントの移行**
   - 移行ガイドの作成
   - authTypeの段階的な変更手順
   - 後方互換性の維持期間設定

2. **モニタリングと最適化**
   - 認証メトリクスの収集
   - authType別の利用統計
   - エラー率の監視

## 実装における注意事項

1. **現在の制限事項**
   - OAuth認証はクエリパラメータでの明示的な指定が必要
   - APIキー認証とJWT認証は別々に処理される
   - セッションに認証情報が保存されない

2. **セキュリティ考慮事項**
   - 環境変数のセキュアな管理
   - トークンの有効期限管理
   - 適切なスコープの設定

3. **互換性の維持**
   - 既存のAPIキー認証は引き続きサポート
   - 段階的な移行を可能にする設計
   - ドキュメントの充実

## 関連ドキュメント

- [Auth0公式ドキュメント](https://auth0.com/docs)
- [express-oauth2-jwt-bearer](https://github.com/auth0/express-oauth2-jwt-bearer)
- [MCP仕様書](https://spec.modelcontextprotocol.io/)
- [Tumiki Proxy Server README](../../apps/proxyServer/README.md)
