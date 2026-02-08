# Tumiki 組織管理・組織利用・個人利用 機能分離とライセンス設計

## 概要

Tumikiにおける利用形態（組織利用、個人利用）の機能分離とライセンス体系の設計。

## エディション構成

### 2層エディション + オプション機能

```
┌─────────────────────────────────────────────────────────────┐
│  Enterprise Edition (EE) - Elastic License 2.0              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  オプション機能                                          ││
│  │  - 組織作成（TUMIKI_ENABLE_ORG_CREATION=true）          ││
│  │  - 組織切り替え                                          ││
│  │  - 管理者ダッシュボード（将来）                          ││
│  └─────────────────────────────────────────────────────────┘│
│  標準EE機能                                                  │
│  - メンバー管理、ロール管理、グループ管理                    │
│  - Dynamic Search、PII Masking                              │
├─────────────────────────────────────────────────────────────┤
│  Community Edition (CE) - Apache 2.0                        │
│  - 個人組織のみ（1ユーザー）                                │
│  - MCP設定・実行                                             │
└─────────────────────────────────────────────────────────────┘
```

## 利用形態の定義

### 1. 組織利用（Enterprise Edition）

| 項目 | 内容 |
|------|------|
| **対象ユーザー** | 企業・チーム |
| **デプロイ方式** | OSS Docker（セルフホスト）またはSaaS |
| **主な用途** | チームでのMCP利用 |
| **ライセンス** | **Elastic License 2.0（有料）** |

**標準機能**:
- メンバー管理（招待、削除、ロール変更）
- ロール管理（カスタムロール作成）
- グループ管理（部門構造）
- MCP設定・実行
- Dynamic Search
- PII Masking
- OAuth/API統合

**オプション機能**（`TUMIKI_ENABLE_ORG_CREATION=true`）:
- 組織の作成・削除
- 複数組織の切り替え
- 管理者ダッシュボード（将来）

**運用パターン**:

| 運用 | 組織作成オプション | 用途 |
|------|:------------------:|------|
| セルフホスト（標準） | OFF | 1組織でチーム運用 |
| セルフホスト（拡張） | ON | 複数組織が必要な場合 |
| SaaS（自社運用） | ON | 複数顧客の組織を管理 |

### 2. 個人利用（Community Edition）

| 項目 | 内容 |
|------|------|
| **対象ユーザー** | 個人開発者 |
| **デプロイ方式** | OSS Docker（セルフホスト） |
| **主な用途** | 個人でのMCP利用 |
| **ライセンス** | **Apache 2.0（無料）** |

**機能**:
- 個人組織のみ（`isPersonal: true`、1ユーザー）
- MCP設定・実行
- 基本的なツール利用

**制限**: メンバー管理、ロール管理、グループ管理は利用不可。

---

## 現状の課題分析

### 課題1: 機能の混在

現在の`apps/manager`は以下の機能が混在:

```
apps/manager/
├── 組織作成 (v2/organization/create)     ← 組織管理機能
├── 組織切り替え (getUserOrganizations)   ← 組織管理機能
├── メンバー管理 (/[orgSlug]/members/)    ← 組織利用機能
├── ロール管理 (/[orgSlug]/roles/)        ← 組織利用機能
├── グループ管理 (/[orgSlug]/org-structure/) ← 組織利用機能
└── MCP設定 (/[orgSlug]/mcps/)            ← 共通機能
```

### 課題2: EE/CE分離が未適用

`apps/mcp-proxy`では既にEE/CE分離パターンが確立されているが、`apps/manager`には未適用:

```typescript
// mcp-proxy の既存パターン
services/dynamicSearch/
├── index.ts      // CE Facade（スタブ）
├── index.ee.ts   // EE 実装
└── *.ee.ts       // EE 機能
```

### 課題3: 個人組織の特別扱い

現在、個人組織（`isPersonal: true`）は:
- 常に全権限を持つ
- メンバー管理が不可
- 組織設定の一部が非表示

→ これを「CE版のデフォルト動作」として整理可能

---

## 機能分離の設計

### フェーズ1: 機能の分類

| カテゴリ | 機能 | CE | EE | EE + 組織作成オプション |
|----------|------|:--:|:--:|:-----------------------:|
| **組織** | 組織作成 | - | - | ✓ |
| | 組織切り替え | - | - | ✓ |
| | 組織削除 | - | - | ✓ |
| | 組織設定変更 | - | ✓ | ✓ |
| **メンバー** | メンバー招待 | - | ✓ | ✓ |
| | メンバー削除 | - | ✓ | ✓ |
| | ロール変更 | - | ✓ | ✓ |
| **ロール** | カスタムロール作成 | - | ✓ | ✓ |
| | ロール編集/削除 | - | ✓ | ✓ |
| **グループ** | グループ作成 | - | ✓ | ✓ |
| | グループメンバー管理 | - | ✓ | ✓ |
| **MCP** | MCP設定 | ✓ | ✓ | ✓ |
| | MCP実行 | ✓ | ✓ | ✓ |
| | Dynamic Search | - | ✓ | ✓ |
| | PII Masking | - | ✓ | ✓ |

**注記**:
- CE版は個人組織のみ（1ユーザー）のため、メンバー・ロール・グループ管理は不要
- EE版の組織作成オプション（`TUMIKI_ENABLE_ORG_CREATION=true`）で複数組織管理が可能
- セルフホストでもSaaSでも同じEEライセンス（Elastic License 2.0）

### フェーズ2: ファイル構成の設計

```
apps/manager/src/
├── server/api/routers/
│   ├── organization/
│   │   ├── index.ts                    // CE: 個人組織の基本機能のみ
│   │   ├── index.ee.ts                 // EE: メンバー・設定管理
│   │   ├── inviteMembers.ee.ts         // EE: メンバー招待
│   │   ├── removeMember.ee.ts          // EE: メンバー削除
│   │   └── updateMemberRole.ee.ts      // EE: ロール変更
│   └── v2/
│       ├── organization/
│       │   ├── index.ts                // CE: 読み取り機能のみ
│       │   ├── index.ee.ts             // EE: 読み取り + 設定変更
│       │   └── createOrganization.ee.ts // EE: 組織作成（オプション機能）
│       ├── role/
│       │   ├── index.ts                // CE: 読み取りのみ（スタブ）
│       │   └── index.ee.ts             // EE: CRUD全て
│       └── group/
│           ├── index.ts                // CE: 読み取りのみ（スタブ）
│           └── index.ee.ts             // EE: CRUD全て
│
├── app/[orgSlug]/
│   ├── members/
│   │   ├── page.tsx                    // 共通（権限に応じて表示分岐）
│   │   └── _components/
│   │       ├── MemberList.tsx          // CE: 閲覧のみ
│   │       └── MemberList.ee.tsx       // EE: 招待・削除・ロール変更
│   ├── roles/
│   │   ├── page.tsx                    // CE: 非表示またはリダイレクト
│   │   └── page.ee.tsx                 // EE: ロール管理
│   └── org-structure/
│       ├── page.tsx                    // CE: 非表示またはリダイレクト
│       └── page.ee.tsx                 // EE: グループ管理
│
├── app/organizations/                  // 組織一覧・作成（オプション機能）
│   ├── page.tsx                        // 組織一覧
│   └── create/
│       └── page.tsx                    // 組織作成
│
├── hooks/
│   └── useEEFeature.ts                 // EE機能利用可否フック
```

**ファイル命名規則**:
- `*.ee.ts` - Enterprise Edition 機能（Elastic License 2.0）
- `*.ee.test.ts` - EEテストファイル（`EE_BUILD=true`で実行）

**オプション機能の制御**:
- 組織作成機能は `*.ee.ts` に実装
- 実行時に `TUMIKI_ENABLE_ORG_CREATION` 環境変数で有効/無効を制御
- UIでも同じ環境変数を参照して表示/非表示を切り替え

### フェーズ3: EE機能の実装パターン（MCP Proxyと同一）

MCP Proxyと同じ **ビルド時分離 + 動的インポート** パターンを採用。
`packages/license/` のような新規パッケージは作成せず、既存のパターンに統一。

#### Facadeパターン（CE版スタブ）

```typescript
// apps/manager/src/server/api/routers/organization/memberManagement/index.ts
// CE Facade - メンバー管理機能のスタブ

/**
 * メンバー管理機能 (CE Facade)
 * Community Edition ではメンバー管理機能が無効。
 */

// CE版ではメンバー管理は利用不可
export const MEMBER_MANAGEMENT_AVAILABLE = false;

// CE版ではスタブ関数を提供
export const inviteMembers = async (): Promise<never> => {
  throw new Error("Member management is not available in Community Edition");
};

export const removeMember = async (): Promise<never> => {
  throw new Error("Member management is not available in Community Edition");
};

// 型のみエクスポート（型互換性のため）
export type { InviteMembersInput, RemoveMemberInput } from "./types.js";
```

#### EE版実装

```typescript
// apps/manager/src/server/api/routers/organization/memberManagement/index.ee.ts
// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * メンバー管理機能 (Enterprise Edition)
 */

export const MEMBER_MANAGEMENT_AVAILABLE = true;

export { inviteMembers } from "./inviteMembers.ee.js";
export { removeMember } from "./removeMember.ee.js";
export { updateMemberRole } from "./updateMemberRole.ee.js";

export type { InviteMembersInput, RemoveMemberInput } from "./types.js";
```

#### 動的インポートによるEE機能ロード

```typescript
// apps/manager/src/server/api/routers/organization/index.ts

// EE機能: メンバー管理（条件付きロード）
type MemberManagementModule = typeof import("./memberManagement/index.ee.js");
let memberManagementModuleCache: MemberManagementModule | null = null;

const loadMemberManagementModule = async (): Promise<MemberManagementModule | null> => {
  if (memberManagementModuleCache) {
    return memberManagementModuleCache;
  }
  try {
    memberManagementModuleCache = await import("./memberManagement/index.ee.js");
    return memberManagementModuleCache;
  } catch {
    return null; // CE版ビルドではファイルが存在しない
  }
};

// ルーター内での使用例
export const organizationRouter = createTRPCRouter({
  inviteMembers: protectedProcedure
    .input(InviteMembersInputSchema)
    .mutation(async ({ ctx, input }) => {
      const memberManagement = await loadMemberManagementModule();
      if (!memberManagement) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Member management is not available in Community Edition",
        });
      }
      return memberManagement.inviteMembers(ctx, input);
    }),
});
```

#### オプション機能（組織作成）の制御

組織作成はEE機能だが、さらに環境変数で有効/無効を制御：

```typescript
// apps/manager/src/server/api/routers/v2/organization/createOrganization.ee.ts
// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

// オプション機能の有効/無効判定
const isOrgCreationEnabled = (): boolean => {
  return process.env.TUMIKI_ENABLE_ORG_CREATION === "true";
};

export const createOrganization = async (ctx: Context, input: CreateOrgInput) => {
  // オプション機能が無効な場合はエラー
  if (!isOrgCreationEnabled()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization creation is disabled. Set TUMIKI_ENABLE_ORG_CREATION=true to enable.",
    });
  }

  // 組織作成ロジック...
};
```

### フェーズ4: UI での分岐

UIでもサーバーサイドと同様に、動的インポートまたはAPI経由でEE機能の有無を判定。

```typescript
// apps/manager/src/hooks/useEEFeature.ts

/**
 * EE機能の利用可否を判定するフック
 * サーバー側でEE機能が利用可能かどうかをAPIで確認
 */
export const useEEFeature = (featureName: string) => {
  const { data, isLoading } = trpc.system.checkEEFeature.useQuery({ featureName });

  return {
    isAvailable: data?.available ?? false,
    isLoading,
  };
};

// 使用例
const MemberInviteButton = () => {
  const { isAvailable, isLoading } = useEEFeature("memberManagement");

  if (isLoading) return <Skeleton />;
  if (!isAvailable) return null;  // CE版では非表示

  return <InviteMemberButton />;
};
```

```typescript
// apps/manager/src/server/api/routers/system.ts

// EE機能チェック用エンドポイント
export const systemRouter = createTRPCRouter({
  checkEEFeature: publicProcedure
    .input(z.object({ featureName: z.string() }))
    .query(async ({ input }) => {
      const { featureName } = input;

      // 動的インポートでEE機能の存在を確認
      const loaders: Record<string, () => Promise<unknown>> = {
        memberManagement: () => import("./organization/memberManagement/index.ee.js"),
        roleManagement: () => import("./v2/role/index.ee.js"),
        groupManagement: () => import("./v2/group/index.ee.js"),
      };

      const loader = loaders[featureName];
      if (!loader) {
        return { available: false };
      }

      try {
        await loader();
        return { available: true };
      } catch {
        return { available: false };
      }
    }),
});
```

---

## 実装計画

### Phase 1: 基盤整備（優先度: 高）

1. **EE/CE分離パターンの導入（MCP Proxyと同一）**
   - `apps/manager/tsconfig.ce.json` 作成（EEファイル除外）
   - `apps/manager/vitest.config.ts` で `EE_BUILD` 環境変数による条件付きテスト実行
   - ESLint ヘッダールール追加（Elastic License 2.0）

2. **EE機能チェック用システムAPI**
   - `systemRouter.checkEEFeature` エンドポイント追加
   - 動的インポートでEE機能の存在を確認

### Phase 2: API分離（優先度: 高）

1. **メンバー管理API（EE化）**
   - `inviteMembers` → `inviteMembers.ee.ts`
   - `removeMember` → `removeMember.ee.ts`
   - `updateMemberRole` → `updateMemberRole.ee.ts`
   - CE版Facade（スタブ）作成

2. **ロール・グループAPI（EE化）**
   - `role/create`, `role/update`, `role/delete` → EE化
   - `group/create`, `group/delete` 等 → EE化
   - CE版Facade（スタブ）作成

3. **組織作成API（EE + オプション）**
   - `v2/organization/create` → `createOrganization.ee.ts`
   - 環境変数 `TUMIKI_ENABLE_ORG_CREATION` で有効/無効を制御
   - `organization/getUserOrganizations` → オプションONなら組織切り替えUI表示

### Phase 3: UI分離（優先度: 中）

1. **ナビゲーション分岐**
   - 組織切り替えUI → オプション有効時のみ表示
   - メンバー・ロール・グループメニュー → CE版は非表示

2. **ページレベル分岐**
   - `/members` → CE版は非表示、EE版はフル機能
   - `/roles` → CE版はアクセス不可
   - `/org-structure` → CE版はアクセス不可
   - `/organizations` → オプション有効時のみ表示

3. **useEEFeature フック**
   - EE機能の利用可否をAPIで確認
   - 機能ごとの表示/非表示制御

### Phase 4: ドキュメント・テスト（優先度: 中）

1. **ドキュメント更新**
   - CLAUDE.md にCE/EE機能一覧追加
   - セルフホストガイド作成（CE版、EE版）
   - オプション機能の設定手順

2. **テスト整備**
   - EEテスト（`.ee.test.ts`）作成（`EE_BUILD=true` で実行）
   - CE版テスト（Facade）作成
   - オプション機能のテスト
   - 各エディションでのE2Eテスト

---

## ライセンス体系

### Community Edition（CE）

```yaml
ライセンス: Apache 2.0
価格: 無料
対象: 個人開発者
デプロイ: セルフホスト（Docker）
制限:
  - 個人組織のみ（1ユーザー）
  - メンバー管理機能なし
  - カスタムロール機能なし
  - グループ管理機能なし
  - Dynamic Search なし
  - PII Masking なし
利用可能機能:
  - MCP設定・実行
  - 基本的なツール管理
```

### Enterprise Edition（EE）

```yaml
ライセンス: Elastic License 2.0
価格: 有料（サブスクリプション）
対象: 企業・チーム
デプロイ: セルフホスト（Docker）またはSaaS
標準機能:
  - CE全機能
  - 複数メンバー管理（招待・削除・ロール変更）
  - カスタムロール作成・管理
  - グループ管理（部門構造）
  - Dynamic Search（AIツール検索）
  - PII Masking（個人情報マスキング）
  - 優先サポート
オプション機能（TUMIKI_ENABLE_ORG_CREATION=true）:
  - 組織の作成・削除
  - 複数組織の切り替え
  - 管理者ダッシュボード（将来）
```

### ライセンス比較表

| 機能 | CE（無料） | EE（有料） | EE + 組織作成オプション |
|------|:----------:|:----------:|:-----------------------:|
| MCP設定・実行 | ✓ | ✓ | ✓ |
| メンバー管理 | - | ✓ | ✓ |
| カスタムロール | - | ✓ | ✓ |
| グループ管理 | - | ✓ | ✓ |
| Dynamic Search | - | ✓ | ✓ |
| PII Masking | - | ✓ | ✓ |
| 組織作成 | - | - | ✓ |
| 複数組織切り替え | - | - | ✓ |
| 最大ユーザー数 | 1 | 無制限 | 無制限 |
| サポート | コミュニティ | 優先 | 優先 |

### 運用パターン

| 運用形態 | エディション | 組織作成オプション | 用途 |
|----------|:------------:|:------------------:|------|
| 個人セルフホスト | CE | - | 個人でMCP利用 |
| 組織セルフホスト | EE | OFF（デフォルト） | 1組織でチーム運用 |
| 組織セルフホスト（拡張） | EE | ON | 複数組織が必要な場合 |
| SaaS（自社運用） | EE | ON | 複数顧客の組織を管理 |

---

## 移行戦略

### 既存ユーザーへの影響

1. **SaaS利用者**: 影響なし（組織作成オプションONで継続）
2. **セルフホスト組織**: EEライセンス購入が必要（機能継続のため）
3. **セルフホスト個人**: CE版として継続利用可能（MCP機能は維持）

### 複数組織が必要な場合のフロー

**セルフホストEE顧客**:
1. 自身で `TUMIKI_ENABLE_ORG_CREATION=true` を設定
2. 管理画面から組織を作成
3. 複数組織間を切り替えて利用

**SaaS利用者**:
1. SaaS管理者が組織作成オプションをONで運用
2. 必要に応じて顧客向けの組織を作成
3. 顧客のユーザーを組織に招待

### 段階的移行

| Phase | 期間 | 内容 |
|-------|------|------|
| 1 | Week 1-2 | 基盤整備（EE/CE分離パターン導入、MCP Proxyと同一設計） |
| 2 | Week 3-4 | API分離（メンバー管理→EE、組織作成→EE+オプション） |
| 3 | Week 5-6 | UI分離（ナビゲーション、ページ、useEEFeatureフック） |
| 4 | Week 7-8 | テスト整備、ドキュメント、リリース準備 |

---

## 技術的考慮事項

### ビルド設定

```json
// apps/manager/tsconfig.ce.json（CE版ビルド用）
{
  "extends": "./tsconfig.build.json",
  "exclude": [
    "src/**/*.ee.ts",
    "src/**/*.ee.test.ts"
  ]
}

// apps/manager/tsconfig.build.json（EE版ビルド用 - 全ファイル含む）
```

### 環境変数

CE/EE の判定はビルド時に決定されるため、ライセンス用の環境変数は不要。
オプション機能のみ環境変数で制御。

```bash
# テスト実行時（MCP Proxyと同一）
EE_BUILD=true pnpm test        # EEテストを含む
pnpm test                       # CEテストのみ

# オプション機能（EE版のみ有効）
TUMIKI_ENABLE_ORG_CREATION=true  # 組織作成機能を有効化
```

### Docker イメージ

```bash
# CE版イメージ（個人利用・無料）
docker build --build-arg EDITION=community -t tumiki:ce .

# EE版イメージ（組織利用・有料）
docker build --build-arg EDITION=enterprise -t tumiki:ee .
```

### Dockerfile での分岐

```dockerfile
ARG EDITION=community

# CE版ビルド
FROM node:22-alpine AS build-ce
RUN pnpm build --filter=manager -- --project=tsconfig.ce.json

# EE版ビルド（全機能含む）
FROM node:22-alpine AS build-ee
RUN pnpm build --filter=manager

# 最終イメージ
FROM node:22-alpine AS runner
COPY --from=build-${EDITION} /app/dist ./dist
```

### オプション機能の実行時制御

```typescript
// apps/manager/src/server/api/routers/v2/organization/createOrganization.ee.ts
// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

// オプション機能の有効/無効判定（環境変数で制御）
const isOrgCreationEnabled = (): boolean => {
  return process.env.TUMIKI_ENABLE_ORG_CREATION === "true";
};

export const createOrganization = protectedProcedure
  .input(CreateOrganizationInput)
  .mutation(async ({ ctx, input }) => {
    // オプション有効時のみ実行可能
    if (!isOrgCreationEnabled()) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization creation is disabled. Set TUMIKI_ENABLE_ORG_CREATION=true to enable.",
      });
    }

    // 組織作成ロジック...
  });
```

```typescript
// UI側でのオプション機能制御例（useEEFeatureフックと組み合わせ）
import { useEEFeature } from "@/hooks/useEEFeature";

export const OrganizationSwitcher = () => {
  // EE機能の利用可否を確認（動的インポートベース）
  const { isAvailable: isOrgManagementAvailable } = useEEFeature("orgManagement");

  // オプション機能の有効/無効を確認（環境変数ベース）
  const { data: config } = trpc.system.getConfig.useQuery();
  const isOrgCreationEnabled = config?.orgCreationEnabled ?? false;

  // EE機能が利用不可、またはオプション無効なら非表示
  if (!isOrgManagementAvailable || !isOrgCreationEnabled) {
    return null;
  }

  return <OrganizationSwitcherUI />;
};
```

---

## 次のステップ

1. **設計レビュー**: この設計文書の最終確認・承認
2. **Phase 1 実装開始**: EE/CE分離パターン導入（MCP Proxyと同一設計）
3. **法務確認**: Apache 2.0 / Elastic License 2.0 のライセンス文言確認
4. **価格設定**: EE版の価格体系決定

---

## 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2026-02-08 | 初版作成 |
| 2026-02-08 | EE版を単一組織に限定、組織作成をSaaS専用に変更 |
| 2026-02-08 | SaaS版を廃止、EE + オプション機能（組織作成）の構成に変更 |
| 2026-02-08 | MCP Proxyと同一設計に統一（ビルド時分離 + 動的インポート）|
