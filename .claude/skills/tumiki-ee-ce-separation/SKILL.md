---
name: tumiki-ee-ce-separation
description: |
  Tumiki Manager アプリのEE/CE（Enterprise Edition/Community Edition）ライセンス分離の実装ガイド。
  ビルド時のコード分離、Facadeパターン、新規EE機能追加の手順を提供。
  「EE機能」「ライセンス分離」「CE版ビルド」などのリクエスト時にトリガー。
sourcePatterns:
  - apps/manager/src/**/*.ee.ts
  - apps/manager/src/**/*.ee.test.ts
  - apps/manager/src/features/ee/**
  - apps/manager/next.config.js
  - apps/manager/tsconfig.ce.json
  - apps/manager/src/lib/ee-stub.js
---

# EE/CE ライセンス分離 - 開発リファレンス

**このスキルを使用する場面：**

- 新しいEE機能の実装時
- CE版/EE版ビルドの動作確認時
- ライセンス分離パターンの理解が必要な時
- EE機能のFacadeパターン実装時
- ビルド設定のカスタマイズ時

## アーキテクチャ概要

Tumiki Managerは、オープンソースのCommunity Edition（CE）と商用のEnterprise Edition（EE）に分離されています。

| Edition | ライセンス          | 対象ユーザー          |
| ------- | ------------------- | --------------------- |
| CE版    | Apache 2.0          | 個人開発者・OSS利用者 |
| EE版    | Elastic License 2.0 | 企業・商用利用者      |

### ビルド時分離

```
┌─────────────────────────────────────────────────────────────┐
│  ソースコード                                               │
│  ├── feature.ts         (CE スタブ)                        │
│  └── feature.ee.ts      (EE 実装)                          │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│  CE版ビルド          │       │  EE版ビルド          │
│  pnpm build:ce       │       │  pnpm build:ee       │
│                      │       │                      │
│  .ee.ts → ee-stub.js │       │  .ee.ts → そのまま   │
│  (空のモジュール)     │       │  (実装を含む)        │
└─────────────────────┘       └─────────────────────┘
```

## ファイル命名規則

| パターン       | 説明                                    |
| -------------- | --------------------------------------- |
| `*.ts`         | CE スタブ（FORBIDDEN エラーを返す）     |
| `*.ee.ts`      | EE 実装（実際のロジック）               |
| `*.ee.test.ts` | EE 機能のテスト                         |
| `index.ts`     | CE Facade（動的インポートまたはスタブ） |
| `index.ee.ts`  | EE エントリーポイント                   |

## SPDXライセンスヘッダー

全てのEEファイル（`.ee.ts`, `.ee.test.ts`）には以下のヘッダーを追加：

```typescript
// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.
```

## 環境変数

| 変数名                            | 説明                 | 値             |
| --------------------------------- | -------------------- | -------------- |
| `NEXT_PUBLIC_EE_BUILD`            | EE版ビルドかどうか   | `true`/`false` |
| `NEXT_PUBLIC_ENABLE_ORG_CREATION` | 組織作成機能の有効化 | `true`/`false` |

## ビルドコマンド

```bash
# CE版ビルド（webpack使用、.ee.tsファイルを除外）
pnpm build:ce

# EE版ビルド（turbopack使用、全ファイルを含む）
pnpm build:ee

# 開発環境（turbopack使用）
pnpm dev
```

## コンポーネント構成

```
apps/manager/
├── next.config.js              # webpack プラグイン（CE版で.ee.ts除外）
├── tsconfig.ce.json            # CE版TypeScript設定
├── package.json                # ビルドスクリプト定義
├── src/
│   ├── lib/
│   │   └── ee-stub.js          # CE版用空モジュール
│   ├── features/
│   │   └── ee/
│   │       └── config.ts       # EE機能設定・判定関数
│   ├── components/
│   │   └── ee/
│   │       └── EEFeatureGate.tsx  # EE機能ゲートコンポーネント
│   └── server/
│       └── api/
│           └── routers/
│               └── organization/
│                   ├── inviteMembers.ts      # CE スタブ
│                   └── inviteMembers.ee.ts   # EE 実装
```

## EE機能設定

### config.ts

```typescript
// src/features/ee/config.ts

// ビルド時に決定される定数
export const EE_AVAILABLE = process.env.NEXT_PUBLIC_EE_BUILD === "true";
export const ORG_CREATION_ENABLED =
  EE_AVAILABLE && process.env.NEXT_PUBLIC_ENABLE_ORG_CREATION === "true";

// EE機能の種類
export type EEFeature =
  | "member-management" // メンバー招待・削除
  | "role-management" // ロール変更
  | "group-management" // グループ管理
  | "organization-creation"; // 組織作成

// EE機能の利用可否を判定
export const isEEFeatureAvailable = (feature: EEFeature): boolean => {
  if (!EE_AVAILABLE) return false;
  if (feature === "organization-creation") return ORG_CREATION_ENABLED;
  return true;
};
```

### EEFeatureGate コンポーネント

```tsx
// src/components/ee/EEFeatureGate.tsx
import type { ReactNode } from "react";
import { isEEFeatureAvailable, type EEFeature } from "@/features/ee/config";

type EEFeatureGateProps = {
  feature: EEFeature;
  children: ReactNode;
  fallback?: ReactNode;
};

export const EEFeatureGate = ({
  feature,
  children,
  fallback,
}: EEFeatureGateProps) => {
  const isAvailable = isEEFeatureAvailable(feature);
  if (!isAvailable) return fallback ?? null;
  return <>{children}</>;
};
```

## Facadeパターン実装

### CE スタブ（feature.ts）

```typescript
// inviteMembers.ts（CE スタブ）
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";

export const inviteMembersInputSchema = z.object({
  emails: z.array(z.string().email()),
});
export const inviteMembersOutputSchema = z.object({
  success: z.boolean(),
  invitedCount: z.number(),
});

export type InviteMembersInput = z.infer<typeof inviteMembersInputSchema>;
export type InviteMembersOutput = z.infer<typeof inviteMembersOutputSchema>;

// CE版: FORBIDDEN エラーを返す
export const inviteMembers = async (_params: {
  input: InviteMembersInput;
  ctx: ProtectedContext;
}): Promise<InviteMembersOutput> => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "メンバー招待機能はEnterprise Editionでのみ利用可能です",
  });
};
```

### EE 実装（feature.ee.ts）

```typescript
// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

// inviteMembers.ee.ts（EE 実装）
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAccess } from "@/lib/auth/organization-access.ee";

export const inviteMembersInputSchema = z.object({
  emails: z.array(z.string().email()),
});
export const inviteMembersOutputSchema = z.object({
  success: z.boolean(),
  invitedCount: z.number(),
});

export type InviteMembersInput = z.infer<typeof inviteMembersInputSchema>;
export type InviteMembersOutput = z.infer<typeof inviteMembersOutputSchema>;

// EE版: 実際の実装
export const inviteMembers = async (params: {
  input: InviteMembersInput;
  ctx: ProtectedContext;
}): Promise<InviteMembersOutput> => {
  const { input, ctx } = params;

  // 組織アクセス検証
  await validateOrganizationAccess(ctx);

  // 招待処理の実装...
  const invitedCount = input.emails.length;

  return {
    success: true,
    invitedCount,
  };
};
```

### ルーターでのインポート

```typescript
// organization/index.ts
// EE実装からインポート（CE版ビルド時はwebpackが.tsにリダイレクト）
import {
  inviteMembers,
  inviteMembersInputSchema,
  inviteMembersOutputSchema,
} from "./inviteMembers.ee"; // ← .ee.tsからインポート

export const organizationRouter = createTRPCRouter({
  inviteMembers: protectedProcedure
    .input(inviteMembersInputSchema)
    .output(inviteMembersOutputSchema)
    .mutation(inviteMembers),
});
```

**重要**: EE機能は必ず`.ee.ts`からインポートしてください。
- **EE版/開発環境**: `.ee.ts`（EE実装）が使用される
- **CE版ビルド**: webpackプラグインが`.ee.ts`を`.ts`（CEスタブ）にリダイレクト

## webpack プラグイン

```javascript
// next.config.js
const isEEBuild = process.env.NEXT_PUBLIC_EE_BUILD === "true";

webpack: (config, { isServer }) => {
  if (!isEEBuild) {
    // CE版ビルド: .ee.ts/.ee.tsx を .ts/.tsx にリダイレクト（CEスタブを使用）
    const cePlugin = {
      apply(compiler) {
        compiler.hooks.normalModuleFactory.tap("CEBuildPlugin", (nmf) => {
          nmf.hooks.beforeResolve.tap("CEBuildPlugin", (resolveData) => {
            if (resolveData.request && resolveData.request.includes(".ee")) {
              // .ee.ts → .ts にリダイレクト
              resolveData.request = resolveData.request.replace(".ee", "");
            }
          });
        });
      },
    };
    config.plugins.push(cePlugin);
  }
  return config;
},
```

## 新しいEE機能追加手順

### 1. CEスタブファイル作成（feature.ts）

```typescript
// newFeature.ts
import { TRPCError } from "@trpc/server";

export const newFeatureInputSchema = z.object({
  /* ... */
});
export const newFeatureOutputSchema = z.object({
  /* ... */
});

export const newFeature = async () => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "この機能はEnterprise Editionでのみ利用可能です",
  });
};
```

### 2. EE実装ファイル作成（feature.ee.ts）

```typescript
// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

// newFeature.ee.ts
export const newFeatureInputSchema = z.object({
  /* ... */
});
export const newFeatureOutputSchema = z.object({
  /* ... */
});

export const newFeature = async (params) => {
  // 実装
};
```

### 3. ルーターに追加

```typescript
// router/index.ts
import { newFeature, newFeatureInputSchema } from "./newFeature";

export const router = createTRPCRouter({
  newFeature: protectedProcedure
    .input(newFeatureInputSchema)
    .mutation(newFeature),
});
```

### 4. テスト作成（feature.ee.test.ts）

```typescript
// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

// newFeature.ee.test.ts
import { describe, test, expect } from "vitest";
import { newFeature } from "./newFeature.ee";

describe("newFeature", () => {
  test("正常に動作する", async () => {
    // テスト実装
  });
});
```

### 5. UI側でのゲート（必要な場合）

```tsx
import { EEFeatureGate } from "@/components/ee/EEFeatureGate";

<EEFeatureGate feature="member-management" fallback={<UpgradePrompt />}>
  <InviteMemberButton />
</EEFeatureGate>;
```

## EE機能一覧（manager）

| 機能           | ファイル                                   | 説明                 |
| -------------- | ------------------------------------------ | -------------------- |
| メンバー招待   | `organization/inviteMembers.ee.ts`         | メール招待送信       |
| 招待一覧取得   | `organization/getInvitations.ee.ts`        | 保留中の招待一覧     |
| 招待再送信     | `organization/resendInvitation.ee.ts`      | 招待メール再送       |
| 招待キャンセル | `organization/cancelInvitation.ee.ts`      | 招待の取り消し       |
| メンバー削除   | `organization/removeMember.ee.ts`          | 組織からメンバー削除 |
| ロール変更     | `organization/updateMemberRole.ee.ts`      | メンバーのロール変更 |
| 組織作成       | `v2/organization/createOrganization.ee.ts` | 新規組織作成         |

## ビルド検証

### CE版の検証

```bash
# CE版ビルド
pnpm build:ce

# EEコードが含まれていないことを確認
grep -r "validateOrganizationAccess" .next/server --include="*.js" | wc -l
# → 0（EE固有コードが含まれていない）
```

### EE版の検証

```bash
# EE版ビルド
pnpm build:ee

# EEコードが含まれていることを確認
grep -r "validateOrganizationAccess" .next/server --include="*.js" | wc -l
# → 2以上（EE固有コードが含まれている）
```

## 実装チェックリスト

### 新機能追加時

- [ ] CEスタブ（`*.ts`）を作成し、FORBIDDEN エラーを返す
- [ ] EE実装（`*.ee.ts`）を作成し、SPDXヘッダーを追加
- [ ] スキーマ（input/output）は両ファイルで同一にする
- [ ] ルーターでCEスタブからインポート
- [ ] テスト（`*.ee.test.ts`）を作成
- [ ] `pnpm build:ce` でEEコードが含まれないことを確認
- [ ] `pnpm build:ee` でEEコードが含まれることを確認

### ビルド設定変更時

- [ ] `next.config.js` のwebpackプラグインが正しく動作
- [ ] `tsconfig.ce.json` で.ee.tsファイルが除外されている
- [ ] `package.json` のビルドスクリプトが正しい

### UI側でEE機能を使用する時

- [ ] `EEFeatureGate` コンポーネントでラップ
- [ ] `isEEFeatureAvailable` で条件分岐
- [ ] CE版でのfallback UIを用意

## トラブルシューティング

### CE版ビルドにEEコードが含まれる

1. ルーターが`.ee.ts`から直接インポートしていないか確認
2. `next.config.js` のwebpackプラグインが有効か確認
3. `--webpack` フラグがbuild:ceに含まれているか確認

### EE版ビルドが失敗する

1. `.ee.ts` ファイルの構文エラーを確認
2. EE専用の依存関係が不足していないか確認
3. `NEXT_PUBLIC_EE_BUILD=true` が設定されているか確認

### 型エラーが発生する

1. CEスタブとEE実装のスキーマが一致しているか確認
2. 両ファイルで同じ型をエクスポートしているか確認
3. `tsconfig.json` の設定を確認

### FORBIDDEN エラーが返される

1. 正しいビルド（CE/EE）を使用しているか確認
2. 環境変数 `NEXT_PUBLIC_EE_BUILD` が設定されているか確認
3. サーバー再起動が必要か確認

## 関連ドキュメント

- [CLAUDE.md - Enterprise Edition (EE) アーキテクチャ](../../../CLAUDE.md#enterprise-edition-ee-アーキテクチャ)
- [tumiki-dynamic-search-feature](../tumiki-dynamic-search-feature/SKILL.md) - EE機能の例
