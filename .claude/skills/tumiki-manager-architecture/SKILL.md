---
name: tumiki-manager-architecture
description: |
  managerアプリのFeature-Based Architectureガイドライン。
  RSC-First + Server Actions + Turborepoパッケージ分割。
sourcePatterns:
  - apps/manager/src/**/*
---

# Manager Feature-Based Monorepo Architecture

**Feature-Based + RSC-First + Server Actions**

## 設計の特徴

| 要素                         | 採用元            | 目的                     |
| ---------------------------- | ----------------- | ------------------------ |
| `features/` 構造             | Bulletproof React | ドメイン単位の凝集       |
| Server Components デフォルト | RSC-First         | パフォーマンス向上       |
| Server Actions               | Next.js 15+       | フォーム処理のシンプル化 |
| パッケージ分割               | Turborepo         | 共通ロジックの再利用     |

## モノレポ構造

```text
tumiki/
├── apps/
│   ├── manager/              # Next.js フロントエンド
│   │   └── src/
│   │       ├── app/          # ルーティング
│   │       ├── features/     # ドメイン機能
│   │       ├── components/   # アプリ固有UI
│   │       ├── hooks/
│   │       ├── lib/
│   │       └── config/
│   │
│   └── mcp-proxy/            # APIサーバー
│
├── packages/
│   ├── ui/                   # 共通UIコンポーネント
│   ├── ai/                   # AI SDK統合
│   ├── shared/               # 共通ユーティリティ
│   ├── db/                   # Prisma + DB
│   ├── keycloak/             # 認証
│   ├── mailer/               # メール
│   ├── oauth-token-manager/  # OAuthトークン
│   └── slack/                # Slack統合
│
└── tooling/                  # ビルド設定
```

## apps/manager 内部構造

```text
apps/manager/src/
├── app/                      # Next.js App Router（ルーティングのみ）
│   ├── [orgSlug]/
│   │   ├── agents/
│   │   ├── mcps/
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
│   ├── mcps/
│   ├── organization/
│   ├── chat/
│   └── dashboard/
│
├── components/               # アプリ固有の共通コンポーネント
├── hooks/                    # アプリ固有の共通フック
├── lib/                      # ユーティリティ
├── config/                   # 設定
└── types/                    # アプリ固有の型
```

## Feature 内部構造

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

## 依存関係ルール

```text
app/ → features/ → components/, hooks/, lib/, types/
           ↓
    packages/ (@tumiki/ui, @tumiki/ai, @tumiki/db, ...)
```

### 禁止される依存

| From          | To           | 理由                                    |
| ------------- | ------------ | --------------------------------------- |
| `features/A`  | `features/B` | Feature間の直接依存禁止                 |
| `packages/`   | `apps/`      | パッケージはアプリに依存しない          |
| `components/` | `features/`  | 共通コンポーネントはFeatureに依存しない |

### Feature間で共通ロジックが必要な場合

1. **共通化**: `lib/` または `packages/` に抽出
2. **上位レイヤー**: `app/` レベルで統合

## Server Components vs Client Components

| 種類                     | 用途                          |
| ------------------------ | ----------------------------- |
| Server（デフォルト）     | データ取得、一覧表示          |
| Client（`'use client'`） | フォーム、モーダル、hooks使用 |

## コード例

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

### Page

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

### Feature index.ts

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

### Server Actions vs tRPC 使い分け

| ユースケース                 | 推奨                               |
| ---------------------------- | ---------------------------------- |
| フォーム送信                 | Server Actions                     |
| ページ初期データ             | 直接DBクエリ（Server Component内） |
| クライアントからの動的クエリ | tRPC                               |
| リアルタイム更新             | tRPC + React Query                 |

## パッケージ間依存関係

```text
apps/manager
├── @tumiki/ui
├── @tumiki/ai
├── @tumiki/shared
├── @tumiki/db
└── @tumiki/keycloak

apps/mcp-proxy
├── @tumiki/ai
├── @tumiki/shared
└── @tumiki/db
```

**ルール:**

- `apps/` は `packages/` に依存可能
- `packages/` は `apps/` に依存禁止
- `packages/` 間は下位パッケージにのみ依存

## Feature 一覧

| Feature        | 説明               | サブ機能                   |
| -------------- | ------------------ | -------------------------- |
| `agents`       | AIエージェント管理 | 作成、実行、スケジュール   |
| `mcps`         | MCPサーバー管理    | 追加、設定、ツール更新     |
| `organization` | 組織管理           | メンバー、ロール、グループ |
| `chat`         | チャット機能       | メッセージ、履歴           |
| `dashboard`    | ダッシュボード     | 統計、アクティビティ       |
| `notification` | 通知機能           | -                          |
| `feedback`     | フィードバック     | -                          |

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

## チェックリスト

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
