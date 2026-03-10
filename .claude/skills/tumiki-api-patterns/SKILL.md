---
description: Tumiki tRPC API設計パターンの包括的リファレンス。ルーター設計、入力バリデーション、エラーハンドリング、認証・認可パターンを提供。
---

# tRPC API パターン - 開発リファレンス

**このスキルを使用する場面：**

- 新しいtRPCルーターの作成時
- 入力バリデーションスキーマの設計時
- エラーハンドリングの実装時
- 認証・認可ロジックの追加時
- 既存APIのリファクタリング時

## プロジェクト構成

```
apps/manager/src/server/api/
├── routers/
│   ├── index.ts           # ルートルーター
│   ├── v2/                # v2 API（推奨）
│   │   ├── userMcpServer/
│   │   │   ├── index.ts
│   │   │   ├── createIntegratedMcpServer.ts
│   │   │   └── schemas.ts
│   │   └── ...
│   └── ...
├── trpc.ts                # tRPC初期化
└── root.ts                # ルーターマージ
```

## 基本パターン

### ルーターの作成

```typescript
// routers/v2/example/index.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const exampleRouter = createTRPCRouter({
  // Query: データ取得
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { id } = input;
      const { db, session } = ctx;

      const item = await db.example.findUnique({
        where: { id, organizationId: session.user.organizationId },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "アイテムが見つかりません",
        });
      }

      return item;
    }),

  // Mutation: データ変更
  create: protectedProcedure
    .input(CreateExampleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      return await db.example.create({
        data: {
          ...input,
          organizationId: session.user.organizationId,
          createdById: session.user.id,
        },
      });
    }),
});
```

### 入力スキーマの定義

```typescript
// routers/v2/example/schemas.ts
import { z } from "zod";

// 基本スキーマ
export const ExampleIdSchema = z.string().uuid();

// 作成用スキーマ
export const CreateExampleInputSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100, "名前は100文字以内"),
  description: z.string().max(500).optional(),
  type: z.enum(["TYPE_A", "TYPE_B", "TYPE_C"]),
  settings: z
    .object({
      enabled: z.boolean().default(true),
      limit: z.number().int().min(1).max(1000).default(100),
    })
    .optional(),
});

// 更新用スキーマ（部分更新）
export const UpdateExampleInputSchema = z.object({
  id: ExampleIdSchema,
  data: CreateExampleInputSchema.partial(),
});

// リスト取得用スキーマ
export const ListExampleInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  filter: z
    .object({
      type: z.enum(["TYPE_A", "TYPE_B", "TYPE_C"]).optional(),
      search: z.string().optional(),
    })
    .optional(),
});

// 型エクスポート
export type CreateExampleInput = z.infer<typeof CreateExampleInputSchema>;
export type UpdateExampleInput = z.infer<typeof UpdateExampleInputSchema>;
export type ListExampleInput = z.infer<typeof ListExampleInputSchema>;
```

## 認証・認可パターン

### プロシージャの種類

```typescript
// trpc.ts での定義

// 認証不要
export const publicProcedure = t.procedure;

// 認証必須
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// 管理者のみ
export const adminProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceUserIsAdmin);

// 組織メンバーのみ
export const organizationProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(enforceUserInOrganization);
```

### リソースベースの認可

```typescript
// 特定リソースへのアクセス権チェック
const checkResourceAccess = async (
  db: PrismaClient,
  userId: string,
  resourceId: string,
): Promise<boolean> => {
  const resource = await db.resource.findFirst({
    where: {
      id: resourceId,
      OR: [{ ownerId: userId }, { sharedWith: { some: { userId } } }],
    },
  });
  return !!resource;
};

// プロシージャ内で使用
export const resourceRouter = createTRPCRouter({
  update: protectedProcedure
    .input(UpdateResourceInputSchema)
    .mutation(async ({ ctx, input }) => {
      const hasAccess = await checkResourceAccess(
        ctx.db,
        ctx.session.user.id,
        input.id,
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "このリソースへのアクセス権がありません",
        });
      }

      // 更新処理...
    }),
});
```

## エラーハンドリング

### TRPCError の使用

```typescript
import { TRPCError } from "@trpc/server";

// エラーコードの使い分け
throw new TRPCError({
  code: "BAD_REQUEST", // 400: 入力が不正
  code: "UNAUTHORIZED", // 401: 認証が必要
  code: "FORBIDDEN", // 403: 権限がない
  code: "NOT_FOUND", // 404: リソースが存在しない
  code: "CONFLICT", // 409: 競合（重複等）
  code: "INTERNAL_SERVER_ERROR", // 500: サーバーエラー
  message: "ユーザー向けメッセージ",
  cause: originalError, // オリジナルエラーを保持
});
```

### エラーハンドリングパターン

```typescript
// 共通エラーハンドラー
const handleDatabaseError = (error: unknown, context: string): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new TRPCError({
        code: "CONFLICT",
        message: `${context}は既に存在します`,
      });
    }
    if (error.code === "P2025") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `${context}が見つかりません`,
      });
    }
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "予期しないエラーが発生しました",
    cause: error,
  });
};

// 使用例
create: protectedProcedure
  .input(CreateUserInputSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      return await ctx.db.user.create({ data: input });
    } catch (error) {
      handleDatabaseError(error, "ユーザー");
    }
  }),
```

## ページネーション

### カーソルベースページネーション

```typescript
export const listRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit } = input;

      const items = await ctx.db.item.findMany({
        take: limit + 1, // 次ページの存在確認用に+1
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        where: { organizationId: ctx.session.user.organizationId },
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),
});
```

## トランザクション

### Prismaトランザクション

```typescript
create: protectedProcedure
  .input(CreateOrderInputSchema)
  .mutation(async ({ ctx, input }) => {
    return await ctx.db.$transaction(async (tx) => {
      // 1. 在庫チェック
      const product = await tx.product.findUnique({
        where: { id: input.productId },
      });

      if (!product || product.stock < input.quantity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "在庫が不足しています",
        });
      }

      // 2. 在庫を減らす
      await tx.product.update({
        where: { id: input.productId },
        data: { stock: { decrement: input.quantity } },
      });

      // 3. 注文を作成
      return await tx.order.create({
        data: {
          productId: input.productId,
          quantity: input.quantity,
          userId: ctx.session.user.id,
        },
      });
    });
  }),
```

## バリデーションパターン

### カスタムバリデーション

```typescript
// 条件付きバリデーション
const ConditionalSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("email"),
    email: z.string().email(),
  }),
  z.object({
    type: z.literal("phone"),
    phone: z.string().regex(/^\d{10,11}$/),
  }),
]);

// 相互依存バリデーション
const DateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "終了日は開始日より後である必要があります",
    path: ["endDate"],
  });

// 非同期バリデーション（プロシージャ内で実行）
const validateUniqueEmail = async (
  db: PrismaClient,
  email: string,
  excludeId?: string,
): Promise<void> => {
  const existing = await db.user.findFirst({
    where: {
      email,
      id: excludeId ? { not: excludeId } : undefined,
    },
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "このメールアドレスは既に使用されています",
    });
  }
};
```

---

## 実装チェックリスト

### 新規ルーター作成時

- [ ] `schemas.ts`で入力スキーマを定義
- [ ] 適切なプロシージャ（public/protected/admin）を選択
- [ ] 組織IDによるデータ分離を実装
- [ ] エラーハンドリングを追加
- [ ] `root.ts`にルーターをマージ
- [ ] 型エクスポートを確認
- [ ] テストを作成（100%カバレッジ）

### セキュリティチェック

- [ ] 認証・認可が適切に設定されている
- [ ] 入力バリデーションが十分
- [ ] SQLインジェクション対策（Prismaで自動）
- [ ] 機密データがログに出力されない
- [ ] レート制限の検討

### パフォーマンス考慮

- [ ] N+1問題の回避（include/selectの適切な使用）
- [ ] 必要なフィールドのみ取得
- [ ] インデックスの確認
- [ ] ページネーションの実装

---

## トラブルシューティング

### 型エラーが発生する

1. スキーマの型とPrismaモデルが一致しているか確認
2. `z.infer<typeof Schema>`で型を生成しているか確認
3. `pnpm db:generate`でPrismaクライアントを再生成

### 認証エラーが発生する

1. `protectedProcedure`を使用しているか確認
2. セッションが正しく取得できているか確認
3. トークンの有効期限を確認

### Prismaエラーが発生する

1. `pnpm db:push`でスキーマを同期
2. `pnpm db:generate`でクライアントを再生成
3. マイグレーションの状態を確認

## 活用のポイント

このスキルを活用することで：

- **一貫性のあるAPI設計**: プロジェクト全体で統一されたパターン
- **型安全性**: Zodスキーマによる入力バリデーションと型推論
- **セキュリティ**: 認証・認可パターンの標準化
- **保守性**: テスト容易性とドキュメント化
