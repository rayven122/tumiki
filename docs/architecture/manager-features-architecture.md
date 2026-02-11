# Manager Feature-Based Monorepo Architecture

## 概要

`apps/manager` のアーキテクチャガイドライン。Feature-Based Architecture + RSC-First + Turborepo パッケージ分割を採用。

### 設計の特徴

| 要素                         | 採用元            | 目的                     |
| ---------------------------- | ----------------- | ------------------------ |
| `features/` 構造             | Bulletproof React | ドメイン単位の凝集       |
| Server Components デフォルト | RSC-First         | パフォーマンス向上       |
| Server Actions               | Next.js 15+       | フォーム処理のシンプル化 |
| パッケージ分割               | Turborepo         | 共通ロジックの再利用     |

### 参考リソース

- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [Monorepo Architecture Guide](https://feature-sliced.design/blog/frontend-monorepo-explained)

---

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

---

## apps/manager 内部構造

```text
apps/manager/src/
├── app/                      # Next.js App Router（ルーティングのみ）
│   ├── [orgSlug]/
│   │   ├── agents/
│   │   │   ├── page.tsx      # Server Component
│   │   │   ├── [agentSlug]/
│   │   │   └── create/
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

---

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

---

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

---

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

---

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

---

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
import { mcpServerRouter } from "@/features/mcps";
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

---

## パッケージ切り出し

### packages/ui/

```text
packages/ui/
├── src/
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── utils.ts              # cn()
│   └── index.ts
│
└── package.json
```

```json
{
  "name": "@tumiki/ui",
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/button.tsx"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

### packages/ai/

```text
packages/ai/
├── src/
│   ├── provider.ts
│   ├── models.ts
│   ├── prompts.ts
│   ├── mcp-client.ts
│   └── index.ts
│
└── package.json
```

### packages/shared/

```text
packages/shared/
├── src/
│   ├── utils/
│   ├── types/
│   ├── constants/
│   └── index.ts
│
└── package.json
```

---

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

packages/ai
├── @tumiki/shared
└── @tumiki/db

packages/ui
└── (外部依存のみ)

packages/shared
└── (外部依存のみ)
```

**ルール:**

- `apps/` は `packages/` に依存可能
- `packages/` は `apps/` に依存禁止
- `packages/` 間は下位パッケージにのみ依存

---

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

---

## 移行手順

### フェーズ1: パッケージ作成

**目標:** 共通コンポーネント・ユーティリティをパッケージとして切り出す

```bash
# 1. packages/ui 作成（shadcn移動）
mkdir -p packages/ui/src/components
cd packages/ui
pnpm init

# package.json の exports 設定
cat > package.json << 'EOF'
{
  "name": "@tumiki/ui",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/components/*.tsx"
  }
}
EOF

# 2. packages/ai 作成
mkdir -p packages/ai/src
cd ../ai && pnpm init

# 3. packages/shared 作成
mkdir -p packages/shared/src
cd ../shared && pnpm init

# 4. 依存関係設定
cd ../../apps/manager
pnpm add @tumiki/ui@workspace:* @tumiki/ai@workspace:* @tumiki/shared@workspace:*
```

**チェックリスト:**

- [ ] `packages/ui/package.json` 作成・exports 設定
- [ ] `packages/ai/package.json` 作成・exports 設定
- [ ] `packages/shared/package.json` 作成・exports 設定
- [ ] `pnpm install` 成功
- [ ] `pnpm build` 成功

### フェーズ2: manager 内部整理

**目標:** Feature-Based Architecture のディレクトリ構造を準備

```bash
cd apps/manager/src

# 1. features ディレクトリ作成
mkdir -p features

# 2. 各 feature のテンプレート作成
for domain in agents mcp-servers organization chat dashboard notification feedback; do
  mkdir -p features/$domain/{components,actions,hooks,api,types}
  touch features/$domain/index.ts
done

# 3. 現在の構造を確認
tree -L 2 features/
```

**チェックリスト:**

- [ ] `features/` ディレクトリ作成
- [ ] 各 feature のサブディレクトリ作成
- [ ] `components/` の共通コンポーネントを特定（`features/` に移動しないもの）
- [ ] `hooks/` の共通フックを特定
- [ ] `lib/` の整理対象を特定
- [ ] `pnpm typecheck` 成功

### フェーズ3: Feature 移行（1つずつ）

**移行順序:**

| 順番 | Feature        | 規模   | 理由                           |
| ---- | -------------- | ------ | ------------------------------ |
| 1    | `notification` | 小     | 依存少ない、練習に最適         |
| 2    | `feedback`     | 小     | 単純な CRUD                    |
| 3    | `dashboard`    | 中     | 他 feature への依存が少ない    |
| 4    | `agents`       | 大     | コア機能、慎重に移行           |
| 5    | `mcps`         | 最大   | 最も複雑、最後に移行           |
| 6    | `organization` | 中〜大 | レガシー API との統合が必要    |

**各 Feature 移行の手順:**

```bash
# 例: notification feature の移行

# 1. 関連ファイルを特定
grep -r "notification" apps/manager/src --include="*.tsx" --include="*.ts" -l

# 2. コンポーネント移動
mv apps/manager/src/app/[orgSlug]/notification/_components/* \
   apps/manager/src/features/notification/components/

# 3. Server Actions 作成
touch apps/manager/src/features/notification/actions/markAsRead.ts

# 4. tRPC ルーター移動
mv apps/manager/src/server/api/routers/notification.ts \
   apps/manager/src/features/notification/api/router.ts

# 5. index.ts でエクスポート
cat > apps/manager/src/features/notification/index.ts << 'EOF'
export { NotificationList } from "./components/NotificationList";
export { notificationRouter } from "./api/router";
EOF

# 6. app/ からの import 更新
# 旧: import { NotificationList } from "@/app/[orgSlug]/notification/_components/NotificationList"
# 新: import { NotificationList } from "@/features/notification"

# 7. テスト実行
pnpm test --filter=@tumiki/manager

# 8. 品質チェック
pnpm typecheck && pnpm lint && pnpm build
```

**Feature 移行完了チェックリスト（各 feature ごと）:**

- [ ] `features/{domain}/` ディレクトリ作成
- [ ] コンポーネント移動・`'use client'` 確認
- [ ] Server Actions 作成・`'use server'` 追加
- [ ] tRPC ルーター移動・統合
- [ ] `index.ts` で公開 API エクスポート
- [ ] `app/` からの import パス更新
- [ ] 既存テストの移動・更新
- [ ] `pnpm typecheck` 成功
- [ ] `pnpm lint` 成功
- [ ] `pnpm test` 成功
- [ ] `pnpm build` 成功
- [ ] 動作確認（ブラウザ）

---

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

---

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
