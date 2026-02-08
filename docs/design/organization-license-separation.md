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
├── libs/
│   └── license/
│       ├── index.ts                    // ライセンス判定ロジック
│       └── features.ts                 // 機能フラグ定義
```

**ファイル命名規則**:
- `*.ee.ts` - Enterprise Edition 機能（Elastic License 2.0）
- `*.ee.test.ts` - EEテストファイル（`EE_BUILD=true`で実行）

**オプション機能の制御**:
- 組織作成機能は `*.ee.ts` に実装
- 実行時に `TUMIKI_ENABLE_ORG_CREATION` 環境変数で有効/無効を制御
- UIでも同じ環境変数を参照して表示/非表示を切り替え

### フェーズ3: ライセンス判定の実装

```typescript
// packages/license/src/index.ts (新規パッケージ)

export type LicenseEdition = "community" | "enterprise";

export type LicenseInfo = {
  edition: LicenseEdition;
  expiresAt: Date | null;
  features: string[];
  options: {
    orgCreation: boolean;  // 組織作成オプション
  };
};

// 各エディションの標準機能一覧
const EDITION_FEATURES: Record<LicenseEdition, string[]> = {
  community: [
    "mcp:config",
    "mcp:execute",
  ],
  enterprise: [
    "mcp:config",
    "mcp:execute",
    "mcp:dynamic-search",
    "mcp:pii-masking",
    "member:read",
    "member:invite",
    "member:remove",
    "member:role:update",
    "role:manage",
    "group:manage",
    "org:settings",
  ],
};

// オプション機能（環境変数で有効化）
const OPTION_FEATURES = {
  orgCreation: [
    "org:create",
    "org:delete",
    "org:switch",
  ],
};

export const getLicenseInfo = (): LicenseInfo => {
  const edition = (process.env.TUMIKI_LICENSE_EDITION ?? "community") as LicenseEdition;
  const orgCreationEnabled = process.env.TUMIKI_ENABLE_ORG_CREATION === "true";

  // 基本機能 + オプション機能を結合
  const baseFeatures = EDITION_FEATURES[edition] ?? EDITION_FEATURES.community;
  const optionalFeatures = orgCreationEnabled && edition === "enterprise"
    ? OPTION_FEATURES.orgCreation
    : [];

  return {
    edition,
    expiresAt: null,
    features: [...baseFeatures, ...optionalFeatures],
    options: {
      orgCreation: orgCreationEnabled && edition === "enterprise",
    },
  };
};

export const isFeatureEnabled = (feature: string): boolean => {
  const license = getLicenseInfo();
  return license.features.includes(feature);
};

// エディション判定ヘルパー
export const isCommunityEdition = (): boolean => getLicenseInfo().edition === "community";
export const isEnterpriseEdition = (): boolean => getLicenseInfo().edition === "enterprise";

// オプション機能判定ヘルパー
export const isOrgCreationEnabled = (): boolean => getLicenseInfo().options.orgCreation;
```

### フェーズ4: UI での分岐

```typescript
// apps/manager/src/components/feature-gate.tsx

type FeatureGateProps = {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export const FeatureGate = ({ feature, children, fallback }: FeatureGateProps) => {
  const { data: license } = trpc.license.getInfo.useQuery();

  if (!license?.features.includes(feature)) {
    return fallback ?? null;
  }

  return <>{children}</>;
};

// 使用例
<FeatureGate feature="member:invite" fallback={<UpgradePrompt />}>
  <InviteMemberButton />
</FeatureGate>
```

---

## 実装計画

### Phase 1: 基盤整備（優先度: 高）

1. **ライセンスパッケージ作成**
   - `packages/license/` を新規作成
   - ライセンス判定ロジック（CE / EE）
   - 環境変数 `TUMIKI_LICENSE_EDITION` のサポート
   - オプション機能 `TUMIKI_ENABLE_ORG_CREATION` のサポート
   - 機能判定ヘルパー関数

2. **EE/CE分離パターンの導入**
   - `apps/manager/tsconfig.ce.json` 作成（EEファイル除外）
   - `apps/manager/vitest.config.ts` で条件付きテスト実行
   - ESLint ヘッダールール追加（Elastic License 2.0）

### Phase 2: API分離（優先度: 高）

1. **組織管理API（EE + オプション）**
   - `v2/organization/create` → `createOrganization.ee.ts`（オプション機能として実装）
   - 実行時に `isOrgCreationEnabled()` で有効/無効を判定
   - `organization/getUserOrganizations` → EE版は所属組織、オプションONなら全組織

2. **メンバー管理API（EE化）**
   - `inviteMembers` → `inviteMembers.ee.ts`
   - `removeMember` → `removeMember.ee.ts`
   - `updateMemberRole` → `updateMemberRole.ee.ts`

3. **ロール・グループAPI（EE化）**
   - `role/create`, `role/update`, `role/delete` → EE化
   - `group/create`, `group/delete` 等 → EE化

### Phase 3: UI分離（優先度: 中）

1. **ナビゲーション分岐**
   - 組織切り替えUI → オプション有効時のみ表示
   - メンバー・ロール・グループメニュー → CE版は非表示

2. **ページレベル分岐**
   - `/members` → CE版は非表示、EE版はフル機能
   - `/roles` → CE版はアクセス不可
   - `/org-structure` → CE版はアクセス不可
   - `/organizations` → オプション有効時のみ表示

3. **FeatureGate コンポーネント**
   - 機能ごとの表示/非表示制御
   - アップグレード促進UI（CE→EE）

### Phase 4: ドキュメント・テスト（優先度: 中）

1. **ドキュメント更新**
   - CLAUDE.md にCE/EE機能一覧追加
   - セルフホストガイド作成（CE版、EE版）
   - オプション機能の設定手順

2. **テスト整備**
   - EEテスト（`.ee.test.ts`）作成
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
| 1 | Week 1-2 | 基盤整備（ライセンスパッケージ、分離パターン導入） |
| 2 | Week 3-4 | API分離（メンバー管理→EE、組織作成→EE+オプション） |
| 3 | Week 5-6 | UI分離（ナビゲーション、ページ、FeatureGate） |
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

```bash
# CE版（デフォルト）- 個人利用
TUMIKI_LICENSE_EDITION=community

# EE版 - 組織利用（標準）
TUMIKI_LICENSE_EDITION=enterprise
TUMIKI_LICENSE_KEY=xxx-xxx-xxx

# EE版 - 組織作成オプション有効（SaaS運用など）
TUMIKI_LICENSE_EDITION=enterprise
TUMIKI_LICENSE_KEY=xxx-xxx-xxx
TUMIKI_ENABLE_ORG_CREATION=true
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
// API側でのオプション機能制御例
import { isOrgCreationEnabled, isEnterpriseEdition } from "@tumiki/license";

export const createOrganization = protectedProcedure
  .input(CreateOrganizationInput)
  .mutation(async ({ ctx, input }) => {
    // EE + オプション有効時のみ実行可能
    if (!isEnterpriseEdition() || !isOrgCreationEnabled()) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization creation is not enabled",
      });
    }

    // 組織作成ロジック...
  });
```

```typescript
// UI側でのオプション機能制御例
import { useFeatureEnabled } from "@tumiki/license/react";

export const OrganizationSwitcher = () => {
  const canCreateOrg = useFeatureEnabled("org:create");

  if (!canCreateOrg) {
    return null;  // 組織作成オプションが無効なら非表示
  }

  return <OrganizationSwitcherUI />;
};
```

---

## 次のステップ

1. **設計レビュー**: この設計文書の最終確認・承認
2. **Phase 1 実装開始**: ライセンスパッケージ作成、分離パターン導入
3. **法務確認**: Apache 2.0 / Elastic License 2.0 のライセンス文言確認
4. **価格設定**: EE版の価格体系決定

---

## 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2026-02-08 | 初版作成 |
| 2026-02-08 | EE版を単一組織に限定、組織作成をSaaS専用に変更 |
| 2026-02-08 | SaaS版を廃止、EE + オプション機能（組織作成）の構成に変更 |
