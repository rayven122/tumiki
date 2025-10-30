# @tumiki/oauth-token-manager

Backend MCP OAuth トークン管理パッケージ

## 概要

このパッケージは、Tumikiプロジェクトの二層OAuth認証アーキテクチャにおいて、Backend MCP（Notion、Slack、GitHubなど）への OAuth トークンを管理します。

## 機能

- **トークン取得**: DBまたはRedisキャッシュから有効なトークンを取得
- **自動リフレッシュ**: 期限切れ間近（5分前）のトークンを自動的にリフレッシュ
- **二層キャッシュ**: Redis + PostgreSQLによる効率的なキャッシュ管理
- **マルチテナント対応**: 組織ベースのトークン分離
- **エラーハンドリング**: 再認証が必要な場合の適切なエラー通知

## インストール

```bash
pnpm add @tumiki/oauth-token-manager
```

## 使用方法

### 基本的な使い方

```typescript
import { createClient } from "redis";

import { oauthTokenManager } from "@tumiki/oauth-token-manager";

// Redisクライアントを設定（オプション）
const redisClient = createClient({ url: "redis://localhost:6379" });
await redisClient.connect();
oauthTokenManager.setRedisClient(redisClient);

// トークンを取得
try {
  const token = await oauthTokenManager.getValidToken(
    "mcp-server-id",
    "user-id",
  );
  console.log("Access Token:", token.accessToken);
} catch (error) {
  if (error instanceof ReAuthRequiredError) {
    // ユーザーに再認証を促す
    console.error("Re-authentication required:", error.message);
  }
}
```

### 手動リフレッシュ

```typescript
import {
  oauthTokenManager,
  TokenRefreshError,
} from "@tumiki/oauth-token-manager";

try {
  const refreshedToken =
    await oauthTokenManager.refreshBackendToken("token-id");
  console.log("Token refreshed:", refreshedToken.accessToken);
} catch (error) {
  if (error instanceof TokenRefreshError) {
    console.error("Refresh failed:", error.message);
  }
}
```

### キャッシュの無効化

```typescript
await oauthTokenManager.invalidateCache("user-id", "mcp-server-id");
```

## アーキテクチャ

### クラス構成

- **OAuthTokenManager**: メインオーケストレーター（シングルトン）
- **TokenCacheManager**: Redisキャッシュ管理
- **TokenRefreshManager**: OAuth 2.0トークンリフレッシュ
- **TokenRepository**: Prismaを使用したDB操作
- **TokenValidator**: トークン有効性チェック

### トークン取得フロー

```
1. Redisキャッシュから取得を試みる
   ↓ (キャッシュミス)
2. DBから取得
   ↓
3. 有効期限チェック
   ↓ (期限切れ間近の場合)
4. 自動リフレッシュ
   ↓
5. キャッシュに保存して返却
```

## エラーハンドリング

### ReAuthRequiredError

ユーザーの再認証が必要な場合にスローされます：

- トークンが見つからない
- トークンが無効
- トークンが期限切れ
- リフレッシュ失敗

```typescript
import { ReAuthRequiredError } from "@tumiki/oauth-token-manager";

try {
  const token = await oauthTokenManager.getValidToken(mcpServerId, userId);
} catch (error) {
  if (error instanceof ReAuthRequiredError) {
    console.log("Token ID:", error.tokenId);
    console.log("User ID:", error.userId);
    console.log("MCP Server ID:", error.mcpServerId);
    // ユーザーをOAuthフローにリダイレクト
  }
}
```

### TokenRefreshError

トークンリフレッシュに失敗した場合にスローされます：

```typescript
import { TokenRefreshError } from "@tumiki/oauth-token-manager";

try {
  const token = await oauthTokenManager.refreshBackendToken(tokenId);
} catch (error) {
  if (error instanceof TokenRefreshError) {
    console.log("Token ID:", error.tokenId);
    console.log("Cause:", error.cause);
  }
}
```

## 環境変数

### ログレベル

```env
LOG_LEVEL=debug  # debug, info, warn, error
```

## 依存関係

- `@tumiki/db`: Prismaクライアントとスキーマ
- `redis`: Redisクライアント（v4.7.0以上）

## 開発

### ビルド

```bash
pnpm build
```

### テスト

```bash
pnpm test
pnpm test:coverage
```

### 型チェック

```bash
pnpm typecheck
```

## ライセンス

このパッケージはTumikiプロジェクトの一部です。
