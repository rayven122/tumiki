---
name: tumiki-manager-architecture
description: |
  manager の Feature-Based Monorepo Architecture ガイドライン。
  RSC-First + Server Actions + Turborepo パッケージ分割を採用。
  「manager アーキテクチャ」「Feature 追加」「パッケージ分割」などのリクエスト時にトリガー。
sourcePatterns:
  - apps/manager/src/app/**/*.{ts,tsx}
  - apps/manager/src/features/**/*.{ts,tsx}
  - apps/manager/src/components/**/*.{ts,tsx}
  - apps/manager/src/hooks/**/*.ts
  - apps/manager/src/lib/**/*.ts
  - packages/ui/src/**/*.{ts,tsx}
  - packages/ai/src/**/*.ts
  - packages/shared/src/**/*.ts
  - docs/architecture/manager-features-architecture.md
---

# manager アーキテクチャガイドライン

## アーキテクチャ概要

Feature-Based Architecture + RSC-First + Turborepo パッケージ分割を採用。

| 要素                         | 採用元            | 目的                     |
| ---------------------------- | ----------------- | ------------------------ |
| `features/` 構造             | Bulletproof React | ドメイン単位の凝集       |
| Server Components デフォルト | RSC-First         | パフォーマンス向上       |
| Server Actions               | Next.js 15+       | フォーム処理のシンプル化 |
| パッケージ分割               | Turborepo         | 共通ロジックの再利用     |

## レイヤー構成

```text
app/              ルーティングのみ（features/ のコンポーネントを呼び出す）
  ↓
features/         ドメイン単位で完結（components, actions, hooks, api）
  ↓
components/       アプリ固有の共通コンポーネント
hooks/            アプリ固有の共通フック
lib/              ユーティリティ
  ↓
packages/         共有パッケージ（@tumiki/ui, @tumiki/ai, @tumiki/db, ...）
```

## 依存関係ルール

| From          | To                              | 可否        |
| ------------- | ------------------------------- | ----------- |
| `app/`        | `features/`                     | ✅ 許可     |
| `features/`   | `components/`, `hooks/`, `lib/` | ✅ 許可     |
| `features/`   | `packages/`                     | ✅ 許可     |
| `features/A`  | `features/B`                    | ❌ **禁止** |
| `components/` | `features/`                     | ❌ **禁止** |
| `packages/`   | `apps/`                         | ❌ **禁止** |

Feature 間で共通ロジックが必要な場合:

1. `lib/` または `packages/` に抽出
2. `app/` レベルで統合

## ディレクトリ構造

### apps/manager 内部

```text
apps/manager/src/
├── app/                      # Next.js App Router（ルーティングのみ）
│   ├── [orgSlug]/
│   │   ├── agents/
│   │   │   ├── page.tsx      # Server Component
│   │   │   └── [agentSlug]/
│   │   ├── mcp-servers/
│   │   ├── dashboard/
│   │   └── ...
│   ├── api/
│   │   └── trpc/
│   └── layout.tsx
│
├── features/                 # ドメイン単位で完結
│   ├── agents/
│   │   ├── components/       # UI（Server/Client混在）
│   │   ├── actions/          # Server Actions
│   │   ├── hooks/            # Client hooks
│   │   ├── api/              # tRPCルーター
│   │   ├── types/
│   │   └── index.ts          # 公開API
│   ├── mcp-servers/
│   ├── organization/
│   ├── chat/
│   └── dashboard/
│
├── components/               # アプリ固有の共通コンポーネント
│   └── layout/
│
├── hooks/                    # アプリ固有の共通フック
│
├── lib/                      # ユーティリティ
│   ├── trpc.ts
│   └── utils.ts
│
├── config/                   # 設定
│   └── env.ts
│
└── types/                    # アプリ固有の型
```

### Feature 内部構造

```text
features/{domain}/
├── components/               # UI コンポーネント
│   ├── AgentCard.tsx         # Server Component
│   ├── AgentList.tsx         # Server Component
│   └── CreateAgentForm.tsx   # 'use client'
│
├── actions/                  # Server Actions
│   ├── createAgent.ts        # 'use server'
│   └── deleteAgent.ts
│
├── hooks/                    # Client側ロジック
│   └── useAgentForm.ts
│
├── api/                      # tRPCルーター
│   └── router.ts
│
├── types/                    # 型定義
│   └── index.ts
│
└── index.ts                  # 公開API
```

### packages/ 構造

```text
packages/
├── ui/                   # 共通UIコンポーネント（shadcn等）
├── ai/                   # AI SDK統合
├── shared/               # 共通ユーティリティ
├── db/                   # Prisma + DB
├── keycloak/             # 認証
├── mailer/               # メール
├── oauth-token-manager/  # OAuthトークン
└── slack/                # Slack統合
```

## Server Components vs Client Components

```text
┌─────────────────────────────────────────────────────────────┐
│                    Server Components（デフォルト）           │
│  - app/ 内の page.tsx, layout.tsx                          │
│  - features/ の一覧表示、カード等                           │
│  - データ取得、初期レンダリング                              │
├─────────────────────────────────────────────────────────────┤
│                    Client Components（'use client'）        │
│  - @tumiki/ui のインタラクティブUI                          │
│  - features/ のフォーム、モーダル                           │
│  - hooks を使用するコンポーネント                            │
└─────────────────────────────────────────────────────────────┘
```

## コードパターン

### Server Component

```typescript
// features/agents/components/AgentList.tsx
// 'use client' なし = Server Component

import { db } from "@tumiki/db";
import { Card } from "@tumiki/ui";
import { AgentCard } from "./AgentCard";
import { CreateAgentButton } from "./CreateAgentButton";

type Props = {
  organizationId: string;
};

export const AgentList = async ({ organizationId }: Props) => {
  const agents = await db.agent.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">エージェント一覧</h2>
        <CreateAgentButton />
      </div>
      <div className="grid gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
};
```

### Client Component

```typescript
// features/agents/components/CreateAgentForm.tsx
"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@tumiki/ui";
import { createAgentAction } from "../actions/createAgent";

export const CreateAgentForm = () => {
  const [state, formAction, pending] = useActionState(createAgentAction, null);

  return (
    <form action={formAction}>
      <div>
        <Label htmlFor="name">エージェント名</Label>
        <Input id="name" name="name" required />
      </div>

      {state?.error && <p className="text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "作成中..." : "作成"}
      </Button>
    </form>
  );
};
```

### Server Action

```typescript
// features/agents/actions/createAgent.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@tumiki/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "名前は必須です"),
});

type ActionState = { error?: string } | null;

export const createAgentAction = async (
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const session = await auth();
  if (!session?.user) {
    return { error: "認証が必要です" };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message };
  }

  const agent = await db.agent.create({
    data: {
      name: parsed.data.name,
      organizationId: session.user.organizationId,
      status: "active",
    },
  });

  revalidatePath("/[orgSlug]/agents");
  redirect(`/${session.user.orgSlug}/agents/${agent.slug}`);
};
```

### Page（app/）

```typescript
// app/[orgSlug]/agents/page.tsx
// Server Component

import { AgentList } from "@/features/agents";
import { getOrganization } from "@/features/organization";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

const AgentsPage = async ({ params }: Props) => {
  const { orgSlug } = await params;
  const org = await getOrganization(orgSlug);

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">エージェント管理</h1>
      <AgentList organizationId={org.id} />
    </div>
  );
};

export default AgentsPage;
```

### Feature index.ts（公開API）

```typescript
// features/agents/index.ts

// Components
export { AgentCard } from "./components/AgentCard";
export { AgentList } from "./components/AgentList";
export { CreateAgentForm } from "./components/CreateAgentForm";

// Actions
export { createAgentAction } from "./actions/createAgent";
export { deleteAgentAction } from "./actions/deleteAgent";

// Hooks
export { useAgentForm } from "./hooks/useAgentForm";

// Types
export type { Agent, CreateAgentInput } from "./types";

// API (tRPC)
export { agentRouter } from "./api/router";
```

## tRPC ルーター統合

### Feature 内のルーター定義

```typescript
// features/agents/api/router.ts

import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { z } from "zod";
import { db } from "@tumiki/db";

export const agentRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      return db.agent.findMany({
        where: { organizationId: input.organizationId },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.agent.findUnique({ where: { id: input.id } });
    }),
});
```

### ルーター統合

```typescript
// lib/trpc/routers/index.ts

import { createTRPCRouter } from "../trpc";
import { agentRouter } from "@/features/agents";
import { mcpServerRouter } from "@/features/mcp-servers";
import { organizationRouter } from "@/features/organization";

export const appRouter = createTRPCRouter({
  agent: agentRouter,
  mcpServer: mcpServerRouter,
  organization: organizationRouter,
});

export type AppRouter = typeof appRouter;
```

### Server Actions vs tRPC 使い分け

| ユースケース                 | 推奨                               |
| ---------------------------- | ---------------------------------- |
| フォーム送信                 | Server Actions                     |
| ページ初期データ             | 直接DBクエリ（Server Component内） |
| クライアントからの動的クエリ | tRPC                               |
| リアルタイム更新             | tRPC + React Query                 |

## 新機能追加手順

### 新しい Feature の追加

1. `features/{domain}/` ディレクトリ作成
2. `components/` にUIコンポーネント配置
3. `actions/` にServer Actions配置
4. `api/router.ts` にtRPCルーター定義
5. `index.ts` で公開APIエクスポート
6. `app/` からのimport設定
7. テスト追加

### 新しいパッケージへの切り出し

1. `packages/{name}/` ディレクトリ作成
2. `package.json` に exports 設定
3. `src/index.ts` にエントリーポイント作成
4. `apps/manager/package.json` に依存追加
5. import パスを更新

## ファイル命名規則

| 種類           | 規則                 | 例                    |
| -------------- | -------------------- | --------------------- |
| コンポーネント | PascalCase           | `AgentCard.tsx`       |
| Server Action  | camelCase            | `createAgent.ts`      |
| フック         | camelCase + use      | `useAgentForm.ts`     |
| tRPCルーター   | camelCase + router   | `router.ts`           |
| 型定義         | PascalCase           | `types/index.ts`      |
| テスト         | 元ファイル名 + .test | `createAgent.test.ts` |
| EE機能         | 元ファイル名 + .ee   | `create.ee.ts`        |

## テストファイル配置ルール

テストは対象ファイルの近くに `__tests__/` ディレクトリを作成して配置:

```text
features/agents/
├── actions/
│   ├── createAgent.ts
│   └── __tests__/
│       └── createAgent.test.ts
├── components/
│   ├── AgentCard.tsx
│   └── __tests__/
│       └── AgentCard.test.tsx
```

## Feature 一覧

| Feature        | 説明               | サブ機能                   |
| -------------- | ------------------ | -------------------------- |
| `agents`       | AIエージェント管理 | 作成、実行、スケジュール   |
| `mcp-servers`  | MCPサーバー管理    | 追加、設定、ツール更新     |
| `organization` | 組織管理           | メンバー、ロール、グループ |
| `chat`         | チャット機能       | メッセージ、履歴           |
| `dashboard`    | ダッシュボード     | 統計、アクティビティ       |
| `notification` | 通知機能           | -                          |
| `feedback`     | フィードバック     | -                          |

## 移行手順

### フェーズ1: パッケージ作成

1. `packages/ui/` 作成（shadcn移動）
2. `packages/ai/` 作成
3. `packages/shared/` 作成
4. 依存関係設定

### フェーズ2: manager 内部整理

1. `features/` ディレクトリ作成
2. `components/` 整理（アプリ固有のみ残す）
3. `hooks/` 整理
4. `lib/` 整理

### フェーズ3: Feature 移行（1つずつ）

**移行順序:**

1. `notification` - 小規模、依存少ない
2. `feedback` - 小規模
3. `dashboard` - 中規模
4. `agents` - 大規模
5. `mcp-servers` - 最大規模
6. `organization` - レガシーAPIとの統合

## 品質チェックリスト

### Feature 移行完了条件

- [ ] `features/{domain}/` ディレクトリ作成
- [ ] `components/` にUIコンポーネント配置
- [ ] `actions/` にServer Actions配置
- [ ] `api/router.ts` にtRPCルーター定義
- [ ] `index.ts` で公開APIエクスポート
- [ ] `app/` からのimport更新
- [ ] テスト通過

### 品質チェック

- [ ] `pnpm typecheck` 成功
- [ ] `pnpm lint` 成功
- [ ] `pnpm test` 成功
- [ ] `pnpm build` 成功
