# 新しいOAuthプロバイダーの追加ガイド

## 概要

このドキュメントでは、Tumiki MCP Managerに新しいOAuthプロバイダーを追加する手順を説明します。

## 追加手順

### 1. Auth0でのプロバイダー設定

#### OAuth専用アプリケーションの使用

1. Auth0ダッシュボードにログイン
2. OAuth専用アプリケーション（`AUTH0_OAUTH_CLIENT_ID`）の設定を確認
3. Allowed Callback URLsに以下を追加：
   - `http://localhost:3000/oauth/auth/callback`
   - `https://your-domain.com/oauth/auth/callback`

#### Social Connection設定

1. Authentication > Social > Create Connection
2. 追加したいプロバイダーを選択
3. Client IDとClient Secretを設定
4. 必要なスコープを設定
5. Connection名を記録（例：`oauth2-notion`）
6. OAuth専用アプリケーションでこのConnectionを有効化

### 2. プロバイダー設定ファイルの作成

`packages/auth/src/providers/[provider].ts`を作成：

```typescript
import type { OAuthProviderConfig } from "./types";

export const [provider]Config: OAuthProviderConfig = {
  connection: "oauth2-[provider]", // Auth0のConnection名
  displayName: "[Provider] OAuth",
  icon: "[Provider]Icon", // アイコンコンポーネント名
  availableScopes: [
    {
      id: "[scope-id]",
      label: "[スコープ表示名]",
      description: "[スコープの説明]",
      scopes: ["scope1", "scope2"], // 実際のスコープ値
      category: "[カテゴリ名]", // オプション
    },
  ],
  tokenEnvVar: "[PROVIDER]_TOKEN", // 環境変数名
  requiredEnvVars: [], // 追加で必要な環境変数
};
```

### 3. プロバイダーの登録

#### OAuth認証フローについて

Tumikiでは、OAuth認証に専用のエンドポイントを使用します：
- ログイン: `/oauth/auth/login`
- コールバック: `/oauth/auth/callback`
- ログアウト: `/oauth/auth/logout`

これらのエンドポイントは`auth0OAuth`クライアントによって自動的に処理されます。

`packages/auth/src/providers/index.ts`を更新：

```typescript
import { [provider]Config } from "./[provider]";

// OAUTH_PROVIDERSに追加
export const OAUTH_PROVIDERS = [
  "google",
  "github",
  "slack",
  "notion",
  "linkedin",
  "[provider]", // 新しいプロバイダー
] as const;

// OAUTH_PROVIDER_CONFIGに追加
export const OAUTH_PROVIDER_CONFIG = {
  // ... 既存のプロバイダー
  [provider]: [provider]Config,
} as const satisfies Record<OAuthProvider, OAuthProviderConfig>;

// PROVIDER_CONNECTIONSに追加
export const PROVIDER_CONNECTIONS = {
  // ... 既存のプロバイダー
  [provider]: [provider]Config.connection,
} as const satisfies Record<OAuthProvider, string>;
```

### 4. 型定義の更新

必要に応じて`packages/auth/src/providers/validation.ts`でZodスキーマを更新：

```typescript
export const OauthProviderSchema = z.enum([
  "google",
  "github",
  "slack",
  "notion",
  "linkedin",
  "[provider]", // 新しいプロバイダー
]);
```

### 5. アクセストークン取得エンドポイントの作成（必要な場合）

プロバイダー固有の処理が必要な場合、`apps/manager/src/server/api/routers/oauth/get[Provider]AccessToken.ts`を作成：

```typescript
import type { ProtectedProcedureContext } from "@/server/api/trpc";
import { getProviderAccessToken } from "@tumiki/auth/server";

export const get[Provider]AccessToken = async ({
  ctx,
}: {
  ctx: ProtectedProcedureContext;
}) => {
  try {
    const accessToken = await getProviderAccessToken("[provider]");
    
    if (!accessToken) {
      return {
        needsReauth: true,
        message: "[Provider]への再認証が必要です",
      };
    }

    return {
      accessToken,
      needsReauth: false,
    };
  } catch (error) {
    return {
      needsReauth: true,
      message: "[Provider]への再認証が必要です",
    };
  }
};
```

### 6. UIページの作成（オプション）

専用のOAuth設定ページが必要な場合、`apps/manager/src/app/(auth)/[provider]-oauth/page.tsx`を作成。

### 7. MCPサーバー定義への統合

`apps/manager/src/constants/mcpServers.ts`でMCPサーバーにOAuth認証を設定：

```typescript
{
  id: "[provider]-mcp-server",
  name: "[Provider] MCP Server",
  authType: AuthType.OAUTH,
  oauthProvider: "[provider]",
  oauthScopes: ["scope1", "scope2"],
  // ... その他の設定
}
```

### 8. ProxyServerでのトークン注入

ProxyServerは自動的に`tokenEnvVar`で指定された環境変数名でトークンを注入します。追加の処理は不要です。

### 9. 環境変数の設定

OAuth専用の環境変数を設定：

```bash
# OAuth専用アプリケーション設定
AUTH0_OAUTH_CLIENT_ID=your-oauth-client-id
AUTH0_OAUTH_CLIENT_SECRET=your-oauth-client-secret
```

## テスト手順

1. 開発環境でAuth0の設定を確認
2. 新しいプロバイダーでOAuth認証フローをテスト
3. アクセストークンが正しく取得できることを確認
4. MCPサーバーでトークンが環境変数として利用できることを確認

## チェックリスト

- [ ] Auth0でプロバイダー設定完了
- [ ] プロバイダー設定ファイル作成
- [ ] プロバイダー登録（index.ts更新）
- [ ] 型定義更新
- [ ] 必要に応じてアクセストークン取得エンドポイント作成
- [ ] UIページ作成（オプション）
- [ ] MCPサーバー定義への統合
- [ ] テスト実施
- [ ] ドキュメント更新

## 注意事項

### セキュリティ

- Client SecretはAuth0側で安全に管理
- 最小限のスコープのみを要求
- トークンの有効期限を適切に設定

### 互換性

- Auth0がサポートするプロバイダーのみ追加可能
- カスタムOAuth2プロバイダーも設定可能

### メンテナンス

- プロバイダーのAPI変更に注意
- スコープの変更や追加時は設定を更新
- 定期的にAuth0の設定を確認

## トラブルシューティング

### プロバイダーが表示されない

1. `OAUTH_PROVIDERS`配列に追加されているか確認
2. プロバイダー設定ファイルが正しくインポートされているか確認
3. ビルドエラーがないか確認

### 認証エラー

1. Auth0のプロバイダー設定を確認
2. Client ID/Secretが正しいか確認
3. コールバックURLが設定されているか確認：
   - OAuth専用: `/oauth/auth/callback`
   - メイン認証: `/api/auth/callback/auth0`
4. OAuth専用アプリケーションでConnectionが有効化されているか確認

### トークン取得エラー

1. スコープが正しく設定されているか確認
2. プロバイダー側でアプリが承認されているか確認
3. Auth0のログを確認

## 関連ドキュメント

- [OAuth認証実装ガイド](./OAUTH_IMPLEMENTATION.md)
- [OAuthアクセストークン取得ガイド](./OAUTH_ACCESS_TOKEN_GUIDE.md)
- [Auth0ドキュメント](https://auth0.com/docs)