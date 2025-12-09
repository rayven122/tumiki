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
    "mcp-server-template-id",
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
await oauthTokenManager.invalidateCache("user-id", "mcp-server-template-id");
```

## アーキテクチャ

### モジュール構成

- **oauth-token-manager**: メインオーケストレーター
- **token-cache**: Redisキャッシュ管理
- **token-refresh**: OAuth 2.0トークンリフレッシュ（OAuth 2.0 Discovery対応）
- **token-repository**: Prismaを使用したDB操作
- **token-validator**: トークン有効性チェック

### OAuth 2.0 Discovery

トークンエンドポイントはDBに保存せず、`authorizationServerUrl`から動的に取得します：

```
authorizationServerUrl + /.well-known/oauth-authorization-server
→ token_endpoint を取得
→ トークンリフレッシュリクエストを送信
```

これにより、Authorization Serverの設定変更に自動的に対応できます。

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
  const token = await oauthTokenManager.getValidToken(
    mcpServerTemplateId,
    userId,
  );
} catch (error) {
  if (error instanceof ReAuthRequiredError) {
    console.log("Token ID:", error.tokenId);
    console.log("User ID:", error.userId);
    console.log("MCP Server Template ID:", error.mcpServerId);
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

### 必須

```env
# Redis接続URL
REDIS_URL=redis://localhost:6379

# Redis暗号化キー（32バイト = 64文字の16進数文字列）
REDIS_ENCRYPTION_KEY=<64文字の16進数文字列>
```

### 暗号化キーの生成方法

Node.js を使用して暗号化キーを生成できます：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

または、OpenSSL を使用：

```bash
openssl rand -hex 32
```

生成された64文字の16進数文字列を `REDIS_ENCRYPTION_KEY` に設定してください。

### オプション

```env
# ログレベル
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
