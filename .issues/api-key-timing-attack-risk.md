---
apps:
  - mcp-proxy
severity: medium
difficulty: high
---

# API Key タイミング攻撃リスク

## 概要

API Key認証において、Prisma `findUnique` による直接比較がタイミング攻撃に対して脆弱である可能性。

## 重大度

中

## 影響範囲

- `apps/mcp-proxy/src/middleware/auth/apiKey.ts`

## 詳細

### 現状

`apiKey.ts:17-37` で、API Keyをデータベースから直接検索している:

```typescript
const fetchApiKeyFromDatabase = async (apiKey: string) => {
  try {
    return await db.mcpApiKey.findUnique({
      where: { apiKey },
      include: {
        mcpServer: {
          select: {
            id: true,
            organizationId: true,
            // ...
          },
        },
      },
    });
  } catch (error) {
    logError("Failed to fetch API key from database", error as Error);
    return null;
  }
};
```

### 問題点

1. **データベースインデックスによるタイミング差異**
   - 存在するAPIキーと存在しないAPIキーで、データベースの応答時間が異なる可能性
   - インデックス検索の性質上、マッチするレコードが見つかった時点で検索が終了

2. **文字列比較のタイミング差異**
   - PostgreSQLの文字列比較は通常、最初の不一致文字で終了する
   - 正しいAPIキーに近い値ほど比較時間が長くなる可能性

3. **定数時間比較の欠如**
   - 機密データの比較には通常、定数時間比較（constant-time comparison）が推奨される
   - 現在の実装では、比較時間から情報が漏洩する可能性

### 影響

- **セキュリティ**: 高度な攻撃者が応答時間を統計的に分析することで、APIキーを推測できる可能性
- **実用性**: 実際の攻撃には大量のリクエストと高精度の時間測定が必要であり、ネットワーク遅延により困難
- **リスクレベル**: 理論的なリスクは存在するが、実際の悪用は困難

## 推奨される対策

1. **APIキーのハッシュ化**

```typescript
// APIキーをハッシュ化して保存
const hashedApiKey = await bcrypt.hash(apiKey, 10);

// 検索時はハッシュ値のプレフィックスを使用
const apiKeyPrefix = apiKey.substring(0, 8);
const candidates = await db.mcpApiKey.findMany({
  where: { apiKeyPrefix },
});

// 定数時間比較でフルマッチを確認
for (const candidate of candidates) {
  if (await bcrypt.compare(apiKey, candidate.hashedApiKey)) {
    return candidate;
  }
}
```

2. **レート制限の実装**（#014参照）
   - タイミング攻撃に必要な大量リクエストを防止

3. **APIキーのローテーション機能**
   - 定期的なキー更新により、タイミング攻撃の時間窓を制限

4. **応答時間の正規化**

```typescript
// 最小応答時間を保証
const startTime = Date.now();
const result = await fetchApiKeyFromDatabase(apiKey);
const elapsed = Date.now() - startTime;
const minResponseTime = 100; // 100ms minimum
if (elapsed < minResponseTime) {
  await new Promise((resolve) =>
    setTimeout(resolve, minResponseTime - elapsed),
  );
}
return result;
```

## 関連ファイル

- `apps/mcp-proxy/src/middleware/auth/apiKey.ts`
- `packages/db/prisma/schema/apiKey.prisma`
