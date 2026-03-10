---
globs: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "**/__tests__/**/*", "**/tests/**/*", "**/test/**/*"]
---

# テスト コーディングルール

## 基本ルール

| ルール | 説明 |
|-------|------|
| フレームワーク | Vitest v4 |
| `test()`必須 | `it()`禁止 |
| テスト名 | 日本語必須 |
| アサーション | `toStrictEqual`（`toEqual`禁止） |
| カバレッジ | 100%目標 |

## モックパターン

```typescript
// 環境変数
vi.stubEnv("NODE_ENV", "test");
vi.unstubAllEnvs();

// タイマー
vi.useFakeTimers({ shouldAdvanceTime: false });
vi.useRealTimers();

// 関数
vi.mock("@/libs/api", () => ({ fetchUser: vi.fn() }));
vi.mocked(fetchUser).mockResolvedValue(mockUser);
```

## DBテスト

```bash
docker compose -f ./docker/compose.yaml up -d db-test
cd packages/db && pnpm db:push:test
```

環境: vitest-environment-vprisma（トランザクション分離）
