---
apps:
  - mcp-proxy
severity: low
difficulty: low
---

# DEV_MODE の曖昧性

## 概要

`DEV_MODE` 環境変数による認証バイパスの実装とドキュメントに齟齬があり、開発者の混乱を招く可能性。

## 重大度

低

## 影響範囲

- `apps/mcp-proxy/src/index.ts`
- 認証ミドルウェア全般

## 詳細

### 現状

`index.ts:32-38` で `DEV_MODE` がログに表示される:

```typescript
const devMode = process.env.DEV_MODE === "true";

logInfo(`Starting Tumiki MCP Proxy on port ${port}`, {
  nodeEnv: process.env.NODE_ENV,
  mode: "stateless (Hono + MCP SDK)",
  devMode: devMode ? "enabled (auth bypass, fixed Context7 MCP)" : "disabled",
});
```

ログメッセージは「auth bypass」と記載しているが、実際の認証ミドルウェアのコードには `DEV_MODE` による認証バイパスが見当たらない。

### 問題点

1. **ドキュメントと実装の不一致**
   - ログメッセージは「auth bypass」を示唆
   - 実際の認証ミドルウェア（`jwt.ts`, `apiKey.ts`, `index.ts`）には `DEV_MODE` チェックがない

2. **開発者の混乱**
   - `DEV_MODE=true` を設定しても認証がバイパスされない可能性
   - または、別の場所で認証バイパスが実装されている可能性

3. **セキュリティリスク**
   - 本番環境で誤って `DEV_MODE=true` が設定された場合の影響が不明確
   - 認証バイパスが意図せず有効になるリスク

4. **テスト環境との区別**
   - `NODE_ENV=test` と `DEV_MODE=true` の違いが不明確
   - どちらを使うべきかのガイドラインがない

### 影響

- **開発効率**: 開発者が期待通りの動作にならず時間を浪費
- **セキュリティ**: 認証バイパスの動作が不明確
- **保守性**: ドキュメントと実装の乖離

## 推奨される対策

1. **実装とドキュメントの同期**

オプションA: 認証バイパスを実装する場合

```typescript
// middleware/auth/index.ts
export const authMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  // DEV_MODE での認証バイパス（開発環境のみ）
  if (
    process.env.DEV_MODE === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    logInfo("Auth bypassed in DEV_MODE");
    c.set("authMethod", AuthType.DEV_MODE);
    c.set("authContext", {
      authMethod: AuthType.DEV_MODE,
      organizationId: "dev-org",
      userId: "dev-user",
      // ...
    });
    return next();
  }
  // 通常の認証フロー
};
```

オプションB: 認証バイパスを削除する場合

```typescript
// index.ts
logInfo(`Starting Tumiki MCP Proxy on port ${port}`, {
  nodeEnv: process.env.NODE_ENV,
  mode: "stateless (Hono + MCP SDK)",
  // DEV_MODE の記述を削除または修正
  devMode: devMode ? "enabled (fixed Context7 MCP for testing)" : "disabled",
});
```

2. **環境変数の明確化**

```typescript
// constants/config.ts
export const ENV_CONFIG = {
  /**
   * 開発モード
   * - 固定のContext7 MCPサーバーを使用
   * - 認証はバイパスしない
   */
  DEV_MODE: process.env.DEV_MODE === "true",

  /**
   * 本番環境判定
   * - 厳格なセキュリティチェック
   */
  IS_PRODUCTION: process.env.NODE_ENV === "production",
} as const;
```

3. **安全性チェックの追加**

```typescript
// 本番環境でのDEV_MODE使用を防止
if (process.env.NODE_ENV === "production" && process.env.DEV_MODE === "true") {
  logError("DEV_MODE cannot be enabled in production environment");
  process.exit(1);
}
```

4. **READMEへのドキュメント追加**

```markdown
## 環境変数

### DEV_MODE

- `true`: 開発モード有効（Context7 MCPサーバーを固定）
- `false` または未設定: 通常モード

注意: `DEV_MODE` は認証をバイパスしません。
テストでの認証バイパスには `NODE_ENV=test` を使用してください。
```

## 関連ファイル

- `apps/mcp-proxy/src/index.ts`
- `apps/mcp-proxy/src/middleware/auth/index.ts`
- `apps/mcp-proxy/src/constants/config.ts`
