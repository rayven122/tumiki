---
name: tumiki-manager
description: |
  managerアプリのFeature-Based Architectureガイドライン。
  RSC-First + Server Actions + Turborepoパッケージ分割。
sourcePatterns:
  - apps/manager/src/**/*
---

# tumiki-manager アーキテクチャ

**Feature-Based + RSC-First + Server Actions**

## レイヤー構成

```
app/          → ルーティングのみ
features/     → ドメイン単位（components, actions, hooks, api）
components/   → アプリ共通コンポーネント
packages/     → 共有パッケージ（@tumiki/ui, @tumiki/db等）
```

## 依存関係

| From       | To                     | 可否        |
| ---------- | ---------------------- | ----------- |
| app/       | features/              | ✅          |
| features/  | components/, packages/ | ✅          |
| features/A | features/B             | ❌ **禁止** |

## Feature構造

```
features/{domain}/
├── components/    # UI（Server/Client混在）
├── actions/       # Server Actions
├── hooks/         # Client hooks
├── api/           # tRPCルーター
└── index.ts       # 公開API
```

## Server vs Client Components

| 種類                     | 用途                          |
| ------------------------ | ----------------------------- |
| Server（デフォルト）     | データ取得、一覧表示          |
| Client（`'use client'`） | フォーム、モーダル、hooks使用 |

## Server Action

```typescript
"use server";
export const createAgentAction = async (
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const session = await auth();
  if (!session?.user) return { error: "認証が必要です" };
  // ...
  revalidatePath("/[orgSlug]/agents");
  redirect(`/${session.user.orgSlug}/agents/${agent.slug}`);
};
```

## チェックリスト

- [ ] Feature構造遵守
- [ ] features間依存なし
- [ ] Server/Client適切に分離
