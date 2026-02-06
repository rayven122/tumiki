---
description: Tumikiプロジェクトのテスト設計パターンとベストプラクティス。Vitest、Prismaテスト、tRPCルーターテスト、モックパターンを提供。
---

# テストパターン - 開発リファレンス

**このスキルを使用する場面：**

- 新しいテストファイルの作成時
- テストカバレッジの向上時
- モックの実装方法を確認したい時
- データベーステストの設定時
- tRPCルーターのテスト作成時

## テストコーディング規約

### 基本ルール

- **フレームワーク**: Vitest v4 (jsdom環境) 使用
- **テスト記法**: **`test` 使用必須（`it` ではない）**、**テスト名は日本語で記載必須**
- **構造**: 関数ごとに `describe` ブロックを記載、古典派単体テスト
- **アサーション**: `toStrictEqual` 使用（`toEqual` ではない）
- **実行**: `pnpm test`（`vitest run`）でテスト実行、`pnpm test:watch`（`vitest`）でウォッチモード
- **カバレッジ**: `pnpm test:coverage` でカバレッジ測定、実装ロジックのカバレッジ100%を目標
- **Reactテスト**: コンポーネントテスト用の@testing-library/react使用
- **E2Eテスト**: エンドツーエンドテスト用のPlaywright使用

### テスト命名規則

```typescript
// ❌ 悪い例 - it()や英語は使用しない
it("should return user data", () => {});

// ✅ 良い例 - 日本語でtest()を使用
test("ユーザーデータを返す", () => {});

// ✅ 良い例 - グループ化にdescribe()を使用(日本語または英語可)
describe("ユーザールーター", () => {
  test("存在するユーザーのデータを返す", () => {});
  test("存在しないユーザーの場合はエラーを返す", () => {});
});
```

### テストファイルの構成

- ユニットテスト: `src/**/__tests__/*.test.ts(x)`
- E2Eテスト: `tests/e2e/*.test.ts`
- テストセットアップ: `tests/setup.ts`
- E2Eテストファイルをユニットテストディレクトリと混在させない

## ベストプラクティス

### 環境変数のモック

**環境変数のモックには`vi.stubEnv()`を使用すること必須** - `process.env.VARIABLE = 'value'`は使用しない

```typescript
import { beforeAll, afterAll, describe, test, expect, vi } from "vitest";

describe("環境変数を使用する関数", () => {
  beforeAll(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("API_URL", "https://api.example.com");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  test("環境変数を正しく読み取る", () => {
    expect(process.env.NODE_ENV).toBe("test");
    expect(process.env.API_URL).toBe("https://api.example.com");
  });
});
```

### タイマーのモック

```typescript
import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";

describe("タイマーを使用する関数", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test("指定時間後にコールバックが呼ばれる", () => {
    const callback = vi.fn();
    setTimeout(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
```

### 関数のモック

```typescript
import { describe, test, expect, vi } from "vitest";

// モジュール全体をモック
vi.mock("@/libs/api", () => ({
  fetchUser: vi.fn(),
}));

// 特定の関数をモック
import { fetchUser } from "@/libs/api";

describe("ユーザー取得", () => {
  test("APIからユーザーを取得する", async () => {
    const mockUser = { id: "1", name: "テストユーザー" };
    vi.mocked(fetchUser).mockResolvedValue(mockUser);

    const result = await fetchUser("1");

    expect(result).toStrictEqual(mockUser);
    expect(fetchUser).toHaveBeenCalledWith("1");
  });
});
```

### スパイの使用

```typescript
import { describe, test, expect, vi } from "vitest";

describe("ログ出力", () => {
  test("エラー時にconsole.errorが呼ばれる", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // エラーを発生させる処理
    handleError(new Error("テストエラー"));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("テストエラー"),
    );

    consoleSpy.mockRestore();
  });
});
```

## データベーステスト環境

### 環境設定

データベースを使用するテストの実行には、専用のテスト環境が必要：

- **テスト用DB**: PostgreSQLコンテナ `db-test`（ポート5435）を使用
- **DB起動**: `docker compose -f ./docker/compose.yaml up -d db-test`
- **スキーマ適用**: `cd packages/db && pnpm db:push:test` でテスト用DBにスキーマを適用
- **環境設定**: `.env.test` でテスト用DB接続設定
- **テスト環境**: vitest-environment-vprisma でトランザクション分離された独立テスト実行

### 接続設定

```
# .env.test
DATABASE_URL="postgresql://root:password@localhost:5435/tumiki_test"
```

### Prismaテストパターン

```typescript
import { describe, test, expect, beforeEach } from "vitest";
import { db } from "@tumiki/db";

describe("ユーザーリポジトリ", () => {
  beforeEach(async () => {
    // vprisma環境では各テストがトランザクションで分離される
    // 明示的なクリーンアップは不要
  });

  test("ユーザーを作成できる", async () => {
    const user = await db.user.create({
      data: {
        email: "test@example.com",
        name: "テストユーザー",
      },
    });

    expect(user.email).toBe("test@example.com");
    expect(user.name).toBe("テストユーザー");
  });

  test("ユーザーをIDで取得できる", async () => {
    // テストデータの準備
    const created = await db.user.create({
      data: {
        email: "find@example.com",
        name: "検索対象ユーザー",
      },
    });

    // テスト対象の実行
    const found = await db.user.findUnique({
      where: { id: created.id },
    });

    // 検証
    expect(found).not.toBeNull();
    expect(found?.email).toBe("find@example.com");
  });
});
```

## tRPCルーターテスト

### 基本パターン

```typescript
import { describe, test, expect, vi, beforeEach } from "vitest";
import { createInnerTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import { db } from "@tumiki/db";

describe("userRouter", () => {
  const createCaller = (session?: Session) => {
    const ctx = createInnerTRPCContext({
      session,
      db,
    });
    return appRouter.createCaller(ctx);
  };

  describe("getById", () => {
    test("認証済みユーザーがデータを取得できる", async () => {
      const session = {
        user: { id: "user-1", organizationId: "org-1" },
        expires: new Date().toISOString(),
      };
      const caller = createCaller(session);

      // テストデータ準備
      await db.user.create({
        data: { id: "user-1", email: "test@example.com" },
      });

      const result = await caller.user.getById({ id: "user-1" });

      expect(result.email).toBe("test@example.com");
    });

    test("未認証の場合はエラーを返す", async () => {
      const caller = createCaller(undefined);

      await expect(caller.user.getById({ id: "user-1" })).rejects.toThrow(
        "UNAUTHORIZED",
      );
    });
  });
});
```

### モック付きテスト

```typescript
import { describe, test, expect, vi, beforeEach } from "vitest";

// 外部サービスをモック
vi.mock("@/libs/external-api", () => ({
  sendNotification: vi.fn(),
}));

import { sendNotification } from "@/libs/external-api";

describe("notificationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("通知を送信する", async () => {
    vi.mocked(sendNotification).mockResolvedValue({ success: true });

    const caller = createCaller(mockSession);
    const result = await caller.notification.send({
      userId: "user-1",
      message: "テスト通知",
    });

    expect(result.success).toBe(true);
    expect(sendNotification).toHaveBeenCalledWith({
      userId: "user-1",
      message: "テスト通知",
    });
  });
});
```

## Reactコンポーネントテスト

### 基本パターン

```typescript
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  test("テキストを表示する", () => {
    render(<Button>クリック</Button>);

    expect(screen.getByRole("button", { name: "クリック" })).toBeInTheDocument();
  });

  test("クリック時にonClickが呼ばれる", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>クリック</Button>);

    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("disabled時はクリックできない", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button onClick={handleClick} disabled>
        クリック
      </Button>,
    );

    await user.click(screen.getByRole("button"));

    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

### tRPCフックのテスト

```typescript
import { describe, test, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { UserList } from "./UserList";

// tRPCプロバイダーのラッパー
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
};

describe("UserList", () => {
  test("ユーザー一覧を表示する", async () => {
    // MSWなどでAPIをモック
    server.use(
      trpc.user.list.query(() => {
        return [
          { id: "1", name: "ユーザー1" },
          { id: "2", name: "ユーザー2" },
        ];
      }),
    );

    render(<UserList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("ユーザー1")).toBeInTheDocument();
      expect(screen.getByText("ユーザー2")).toBeInTheDocument();
    });
  });
});
```

---

## 実装チェックリスト

### 新規テスト作成時

- [ ] `test()`を使用（`it()`ではない）
- [ ] テスト名は日本語で記載
- [ ] 関数ごとに`describe`ブロックを作成
- [ ] `toStrictEqual`を使用（`toEqual`ではない）
- [ ] 環境変数は`vi.stubEnv()`でモック
- [ ] タイマーは`vi.useFakeTimers()`でモック
- [ ] クリーンアップ処理を`afterEach`/`afterAll`で実装

### カバレッジ確認

- [ ] `pnpm test:coverage`でカバレッジを確認
- [ ] 実装ロジックのカバレッジ100%を達成
- [ ] エッジケースをカバー
- [ ] エラーケースをカバー

### データベーステスト

- [ ] `db-test`コンテナが起動している
- [ ] `pnpm db:push:test`でスキーマを適用済み
- [ ] vprisma環境でトランザクション分離を確認

---

## トラブルシューティング

### テストが失敗する

1. `vi.clearAllMocks()`で前のテストの影響を排除
2. `vi.unstubAllEnvs()`で環境変数を復元
3. `vi.useRealTimers()`でタイマーを復元

### データベーステストが失敗する

1. `docker compose -f ./docker/compose.yaml up -d db-test`でDBを起動
2. `cd packages/db && pnpm db:push:test`でスキーマを適用
3. `.env.test`の接続設定を確認

### モックが効かない

1. `vi.mock()`がファイルの先頭にあるか確認
2. `vi.mocked()`で型安全にモックを使用
3. `beforeEach`で`vi.clearAllMocks()`を呼ぶ

## 活用のポイント

このスキルを活用することで：

- **一貫性のあるテスト**: プロジェクト全体で統一されたテストパターン
- **日本語テスト名**: 可読性の高いテストケース
- **型安全なモック**: Vitestの型推論を活用
- **独立したテスト**: トランザクション分離による信頼性の高いDBテスト
