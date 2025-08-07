# Auth0認証実装ガイド - Tumiki Proxy Server

## 概要

Tumiki Proxy ServerにおけるAuth0認証の実装状況と今後の実装計画です。`express-oauth2-jwt-bearer`ライブラリを使用し、既存のAPIキー認証と共存させながら段階的に移行します。

## 現在の実装状況

### ✅ 実装済み

1. **統合認証ミドルウェア** (`apps/proxyServer/src/middleware/integratedAuth.ts`)
   - URLパスベース認証（`/mcp/:userMcpServerInstanceId`）
   - APIキー認証とOAuth認証の統合処理
   - AuthenticatedRequest型による型安全な認証情報管理
   - セッションベース認証の優先処理

2. **AuthTypeベースの認証制御**
   - `API_KEY`: APIキー認証のみ許可（完全実装）
   - `OAUTH`: OAuth認証のみ許可（完全実装）
   - `NONE`: セキュリティ上の理由で403エラーを返す（実装済み）
   - `BOTH`: 501エラーを返す（対応予定なし）
   - authTypeに応じた適切なエラーメッセージ

3. **セッション管理への認証情報統合** (`apps/proxyServer/src/utils/session.ts`)
   - AuthInfo型の定義（type、userId、organizationId等）
   - セッションへのauthInfo統合完了
   - TransportType列挙型（SSE、STREAMABLE_HTTP）
   - セッション統計機能の実装

4. **新しいRESTfulエンドポイント** (`apps/proxyServer/src/index.ts`)
   - `/mcp/:userMcpServerInstanceId` - MCPサーバーID指定エンドポイント
   - `/sse/:userMcpServerInstanceId` - SSE transport用
   - `/messages/:userMcpServerInstanceId` - メッセージ送信用
   - レガシーエンドポイント（`/mcp`、`/sse`、`/messages`）の後方互換性維持

5. **JWT検証機能** (`express-oauth2-jwt-bearer`使用)
   - RS256アルゴリズムによる署名検証
   - Auth0ドメイン設定（AUTH0_DOMAIN、AUTH0_M2M_DOMAIN）
   - Bearer tokenの自動検証

6. **条件付きOAuth認証ミドルウェア** (`apps/proxyServer/src/middleware/auth.ts`)
   - クエリパラメータ（`useOAuth=true` または `use_oauth=true`）による条件付き認証
   - JWT検証の実装（RS256アルゴリズム）
   - エラーハンドリングとログ出力

7. **CORS設定**
   - Authorizationヘッダーの許可
   - x-api-key、mcp-session-id等のカスタムヘッダーサポート

### ✅ すべての実装完了

すべての必要な機能が実装されました。

## 実装ステップ

### ✅ 1. 依存関係の追加（完了）

```bash
pnpm add express-oauth2-jwt-bearer --filter @tumiki/proxy-server
```

### ✅ 2. 環境変数の設定（完了）

`.env`ファイルに以下を追加：

```env
# Auth0設定
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

### ✅ 3. 統合認証ミドルウェアの作成（完了）

`apps/proxyServer/src/middleware/integratedAuth.ts`:

- ✅ express-oauth2-jwt-bearerを使用したJWT検証
- ✅ APIキー認証とOAuth認証の統合処理
- ✅ authTypeに基づく認証方式の選択
- ✅ セッションベース認証のサポート

### ✅ 4. OAuthディスカバリーエンドポイント（完了）

`apps/proxyServer/src/routes/oauth/index.ts`:

- ✅ `/.well-known/oauth-authorization-server`エンドポイント
- ✅ `/.well-known/openid-configuration`エンドポイント
- ✅ Auth0設定情報の公開

### ✅ 5. 既存ルートへの統合（完了）

`apps/proxyServer/src/index.ts`:

- ✅ 統合認証ミドルウェアの適用
- ✅ 新しいRESTfulエンドポイントの追加
- ✅ 後方互換性の維持（レガシーエンドポイント）

### ✅ 6. セッション管理の拡張（完了）

`apps/proxyServer/src/utils/session.ts`:

- ✅ AuthInfo型の定義
- ✅ セッションへの認証情報統合
- ✅ TransportType列挙型の定義

### ✅ 7. エラーハンドリング（完了）

`apps/proxyServer/src/middleware/integratedAuth.ts`:

- ✅ 認証エラーの適切な処理（401、403、501）
- ✅ WWW-Authenticateヘッダーの設定（OAuth時）
- ✅ authTypeに応じたエラーメッセージ

### ✅ 8. ドキュメント更新（完了）

- ✅ 本ドキュメントの更新
- ✅ README.mdへの認証設定手順追加
- ✅ 移行ガイドの作成（docs/auth/migration-guide.md）

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

### 現在の実装（integratedAuthMiddleware）

```typescript
// apps/proxyServer/src/middleware/integratedAuth.ts
import { type Request, type Response, type NextFunction } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { validateApiKey } from "../libs/validateApiKey.js";
import { db } from "@tumiki/db/tcp";
import type { AuthType } from "@tumiki/db";
import { sessions } from "../utils/session.js";

/**
 * JWT検証ミドルウェアの設定
 */
const jwtCheck = auth({
  audience: `https://${process.env.AUTH0_DOMAIN || ""}/api`,
  issuerBaseURL: `https://${process.env.AUTH0_M2M_DOMAIN || ""}/`,
  tokenSigningAlg: "RS256",
});

/**
 * 統合認証ミドルウェア
 * URLパスまたはAPIキーからMCPサーバーを識別し、authTypeに基づいて適切な認証方式を選択
 */
export const integratedAuthMiddleware = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // セッションベースの認証を優先
    const sessionId = req.query.sessionId as string | undefined;
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session && session.authInfo) {
        req.authInfo = session.authInfo;
        return next();
      }
    }

    // APIキーの取得（新しいX-API-Keyヘッダーを優先）
    const apiKey: string | undefined =
      (req.headers["x-api-key"] as string) ||
      (req.headers["api-key"] as string) ||
      (req.query["api-key"] as string) ||
      undefined;

    const authHeader = req.headers.authorization;
    const hasBearerToken = authHeader?.startsWith("Bearer ");

    // URLパスからMCPサーバーインスタンスIDを取得
    let mcpServerInstanceId = req.params.userMcpServerInstanceId;

    // レガシーエンドポイントの場合、APIキーからMCPサーバーインスタンスIDを取得
    if (!mcpServerInstanceId && apiKey) {
      mcpServerInstanceId =
        (await getMcpServerInstanceIdFromApiKey(apiKey)) || undefined;
      if (!mcpServerInstanceId) {
        sendAuthError(res, 401, "Invalid API key");
        return;
      }
    }

    // MCPサーバーインスタンスの情報を取得
    const mcpServerInstance = await getMcpServerInstance(mcpServerInstanceId);
    if (!mcpServerInstance) {
      sendAuthError(res, 404, "MCP server instance not found");
      return;
    }

    const authType = mcpServerInstance.authType;

    // authTypeに基づく認証チェック
    switch (authType) {
      case "NONE":
        // セキュリティ上の理由で拒否
        sendAuthError(
          res,
          403,
          "Authentication type NONE is not allowed for security reasons",
        );
        return;

      case "API_KEY":
        // APIキー認証が必須
        if (!apiKey) {
          sendAuthError(res, 401, getAuthErrorMessage(authType));
          return;
        }
        // APIキーの検証...
        break;

      case "OAUTH":
        // OAuth認証が必須
        if (!hasBearerToken) {
          sendAuthError(res, 401, getAuthErrorMessage(authType), -32000, {
            "WWW-Authenticate": 'Bearer realm="MCP API"',
          });
          return;
        }
        // JWT検証を実行...
        break;

      case "BOTH":
        // 実装予定なし
        sendAuthError(
          res,
          501,
          "BOTH authentication type is not supported",
        );
        return;
    }
  };
};
```

### セッション管理の実装（完了）

```typescript
// apps/proxyServer/src/utils/session.ts
export enum TransportType {
  SSE = "sse",
  STREAMABLE_HTTP = "streamable_http",
}

// 認証情報の型定義
export interface AuthInfo {
  type: "api_key" | "oauth";
  userId?: string;
  userMcpServerInstanceId?: string;
  organizationId?: string;
}

// 共通セッション情報
export interface SessionInfo {
  id: string;
  transportType: TransportType;
  clientId: string;
  createdAt: number;
  lastActivity: number;
  errorCount: number;
  cleanup?: () => Promise<void>;
  authInfo: AuthInfo;  // 認証情報を含む
}

// 全セッション管理（transport種別問わず）
export const sessions = new Map<string, SessionInfo>();
```

### 条件付きOAuth認証ミドルウェア（レガシー）

```typescript
// apps/proxyServer/src/middleware/auth.ts
// クエリパラメータベースの条件付き認証（後方互換性のため維持）
export const conditionalAuthMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const useOAuth =
      req.query.useOAuth === "true" || req.query.use_oauth === "true";

    if (!useOAuth) {
      return next();
    }

    // JWT検証を実行...
  };
};
```

## テスト方法

### 1. ローカル環境でのテスト

#### 新しいRESTfulエンドポイント（推奨）

```bash
# サーバー起動
pnpm dev --filter @tumiki/proxy-server

# authType = API_KEY の場合
curl -X POST http://localhost:8080/mcp/{mcpServerInstanceId} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# authType = OAUTH の場合
curl -X POST http://localhost:8080/mcp/{mcpServerInstanceId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_M2M_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# authType = NONE の場合（403エラー - セキュリティ対策）
curl -X POST http://localhost:8080/mcp/{mcpServerInstanceId} \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
# → 403エラー: "Authentication type NONE is not allowed for security reasons"

# authType = BOTH の場合（未対応）
# 現在は501エラーを返すが、実装予定なし
```

#### レガシーエンドポイント（後方互換性）

```bash
# APIキー認証でアクセス（既存の方法）
curl -X POST http://localhost:8080/mcp?api-key=your_api_key \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# 条件付きOAuth認証（useOAuthパラメータ使用）
# 事前にM2Mトークンを取得しておく必要があります
curl -X POST "http://localhost:8080/mcp?useOAuth=true" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_M2M_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### 2. AuthTypeベースのテスト

```bash
# authType = API_KEY の場合
# APIキーのみ有効
curl -X POST http://localhost:8080/mcp/{mcpServerInstanceId} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
# → 成功

# Bearer tokenは無効
curl -X POST http://localhost:8080/mcp/{mcpServerInstanceId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_M2M_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
# → 401エラー: "API key authentication required for this server"

# authType = OAUTH の場合
# Bearer tokenのみ有効
curl -X POST http://localhost:8080/mcp/{mcpServerInstanceId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_M2M_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
# → 成功

# APIキーは無効
curl -X POST http://localhost:8080/mcp/{mcpServerInstanceId} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
# → 401エラー: "OAuth authentication required for this server"
```

### 3. M2Mトークンの取得方法（手動）

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

### 4. Auth0設定確認

1. Auth0ダッシュボードでAPIを作成
   - Identifier: `https://auth.tumiki.cloud/api`
   - Signing Algorithm: RS256
2. M2Mアプリケーションを作成
   - アプリケーション名: Tumiki MCP M2M
   - 対象API: 上記で作成したAPI
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

## 実装完了

Auth0認証機能の実装がすべて完了しました。以下の機能が利用可能です：

1. **統合認証ミドルウェア**: authTypeに基づく認証制御
2. **RESTfulエンドポイント**: MCPサーバーID指定による直接アクセス
3. **OAuthディスカバリー**: Auth0設定の自動検出
4. **包括的なドキュメント**: 設定手順と移行ガイド

### 次のステップ

1. **本番環境へのデプロイ**
2. **既存クライアントの段階的移行**
3. **モニタリングとパフォーマンス最適化**

## 実装における注意事項

1. **現在の制限事項**
   - authType="BOTH"は対応しない（501エラーを返す）
   - OAuthディスカバリーエンドポイントが未実装

2. **セキュリティ考慮事項**
   - authType="NONE"はセキュリティ上の理由で403エラーを返す
   - 環境変数のセキュアな管理が必要
   - トークンの有効期限管理
   - 適切なスコープの設定

3. **互換性の維持**
   - 既存のAPIキー認証は引き続きサポート
   - レガシーエンドポイント（/mcp、/sse）の維持
   - 新しいRESTfulエンドポイントへの段階的移行を推奨

## 関連ドキュメント

- [Auth0公式ドキュメント](https://auth0.com/docs)
- [express-oauth2-jwt-bearer](https://github.com/auth0/express-oauth2-jwt-bearer)
- [MCP仕様書](https://spec.modelcontextprotocol.io/)
- [Tumiki Proxy Server README](../../apps/proxyServer/README.md)
