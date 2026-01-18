---
apps:
  - mcp-proxy
severity: medium
difficulty: low
---

# エラーメッセージからの情報漏洩

## 概要

JWT/API Key検証失敗時に、詳細なエラーメッセージを返すことで、攻撃者がエラー原因を推測できる脆弱性。

## 重大度

中

## 影響範囲

- `apps/mcp-proxy/src/middleware/auth/jwt.ts`
- `apps/mcp-proxy/src/middleware/auth/index.ts`
- `apps/mcp-proxy/src/middleware/auth/apiKey.ts`

## 詳細

### 現状

JWT認証ミドルウェア（`jwt.ts:55-69`、`index.ts:185-199`）では、エラーメッセージの内容に基づいて異なるレスポンスを返している:

```typescript
if (errorMessage.includes("expired")) {
  return c.json(createUnauthorizedError("Token has expired"), 401);
}

if (errorMessage.includes("signature")) {
  return c.json(createUnauthorizedError("Invalid token signature"), 401);
}
```

API Key認証（`apiKey.ts:74-82`）でも同様:

```typescript
if (!mcpApiKey?.isActive || !mcpApiKey.mcpServer) {
  return c.json(createUnauthorizedError("Invalid or inactive API key"), 401);
}

if (mcpApiKey.expiresAt && mcpApiKey.expiresAt < new Date()) {
  return c.json(createUnauthorizedError("API key has expired"), 401);
}
```

### 問題点

1. **エラーメッセージの分岐により攻撃者が認証失敗の原因を特定可能**
   - "Token has expired" → 有効なトークンだが期限切れ
   - "Invalid token signature" → 署名の改ざん検出
   - "API key has expired" → 有効なAPIキーだが期限切れ
   - "Invalid or inactive API key" → APIキーが無効

2. **情報収集フェーズでの悪用**
   - 攻撃者は異なるエラーメッセージを観察することで、どの段階で認証が失敗したかを知ることができる
   - 期限切れのエラーが返る場合、APIキーやトークンの形式自体は正しいと推測できる

### 影響

- **セキュリティ**: 攻撃者が認証システムの構造を理解しやすくなる
- **ブルートフォース攻撃の効率化**: 有効な認証情報に近づいているかどうかのフィードバックを得られる
- **タイミング攻撃との組み合わせ**: 詳細なエラー情報とタイミング情報を組み合わせて攻撃を最適化できる

## 推奨される対策

1. **統一されたエラーメッセージを使用**

```typescript
// 推奨実装
} catch (error) {
  logError("JWT verification failed", error as Error);
  return c.json(createUnauthorizedError("Authentication failed"), 401);
}
```

2. **詳細なエラー情報はログにのみ記録**
   - クライアントには汎用的なエラーメッセージを返す
   - 詳細な原因はサーバーログに記録（既に一部実装済み）

3. **エラーレスポンスの一貫性を確保**
   - すべての認証失敗で同じHTTPステータスコードと同じメッセージ構造を返す

## 関連ファイル

- `apps/mcp-proxy/src/middleware/auth/jwt.ts`
- `apps/mcp-proxy/src/middleware/auth/index.ts`
- `apps/mcp-proxy/src/middleware/auth/apiKey.ts`
- `apps/mcp-proxy/src/libs/error/index.ts`
