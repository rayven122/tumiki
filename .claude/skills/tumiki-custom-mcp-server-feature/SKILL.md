---
name: tumiki-custom-mcp-server-feature
description: |
  Tumiki統合MCPサーバー（Type: CUSTOM）の実装・拡張・デバッグのための包括的なガイドライン。
  複数のMCPサーバーテンプレートを1つのサーバーに統合する機能の開発に使用。
  「統合MCP」「CUSTOMサーバー」「テンプレート統合」などのリクエスト時にトリガー。
sourcePatterns:
  - packages/db/prisma/schema/userMcpServer.prisma
  - apps/manager/src/server/api/routers/v2/userMcpServer/**
  - apps/manager/src/atoms/integratedFlowAtoms.ts
  - apps/manager/src/app/**/mcps/create-integrated/**
---

# 統合MCPサーバー（CUSTOM）機能 - 開発リファレンス

## アーキテクチャ概要

統合MCPサーバーは、複数のMCPサーバーテンプレートを1つのサーバーとして束ねる機能。

### ServerType による違い

| 項目 | OFFICIAL | CUSTOM |
|------|----------|--------|
| テンプレート数 | 1つのみ | 2つ以上 |
| 認証方式 | API_KEY / OAUTH / NONE | **OAuth のみ** |
| 作成フロー | シンプル | 4ステップウィザード |
| ユースケース | 単一サービス連携 | 複数サービス統合 |

### 主要な概念

```
McpServerTemplate（サービステンプレート）
    - 全ユーザー共通のカタログ（例: GitHub, Notion, Figma）
    - 接続に必要な envVarKeys を定義
    ↓
McpServerTemplateInstance（接続設定/テンプレートインスタンス）
    - ユーザーが作成したテンプレートの設定インスタンス
    - 個別の normalizedName を持つ（例: "github-work", "github-personal"）
    - 有効化されたツール一覧 (allowedTools) を保持
    ↓
McpServer（統合サーバー）
    - 複数の接続設定を束ねて公開するサーバー
    - serverType: CUSTOM
    - authType: OAUTH（固定）
```

### データフロー

```
[作成フロー]
1. 接続設定選択 → 2. ツール選択 → 3. サーバー情報入力 → 4. 確認・作成

[バックエンド処理]
createIntegratedMcpServer:
  1. テンプレート存在確認・ツールバリデーション
  2. 既存McpConfigのenvVars検索（再利用）
  3. McpServer作成（CUSTOM, OAUTH）
  4. McpServerTemplateInstance作成（各テンプレートごと）
  5. McpConfig作成（envVars設定）
```

## コンポーネント構成

### バックエンド

```
apps/manager/src/server/api/routers/v2/userMcpServer/
├── index.ts                      # tRPCルーター定義、スキーマ
├── createIntegratedMcpServer.ts  # 統合サーバー作成ロジック
└── ...
```

### フロントエンド

```
apps/manager/src/app/[orgSlug]/mcps/create-integrated/
├── page.tsx                            # ページコンポーネント
├── _components/
│   ├── CreateIntegratedPageClient.tsx  # メインクライアントコンポーネント
│   ├── StepIndicator.tsx               # ステップインジケーター
│   ├── TemplateSelector.tsx            # ステップ1: 接続設定選択
│   ├── ToolSelector.tsx                # ステップ2: ツール選択
│   ├── ServerInfoForm.tsx              # ステップ3: サーバー情報入力
│   ├── ReviewStep.tsx                  # ステップ4: 確認
│   └── EnvVarForm.tsx                  # 環境変数フォーム
├── _hooks/
│   └── useConnectionConfigs.ts         # 接続設定取得フック
└── _utils/
    └── prepareTemplateData.ts          # テンプレートデータ準備
```

### 状態管理

```
apps/manager/src/atoms/integratedFlowAtoms.ts
```

### スキーマ定義

```
packages/db/prisma/schema/userMcpServer.prisma
```

## 型定義

### ServerType / AuthType Enum

```typescript
// packages/db/prisma/schema/userMcpServer.prisma
enum ServerType {
  CUSTOM    // 統合MCPサーバー（複数テンプレート）
  OFFICIAL  // 公式MCPサーバー（単一テンプレート）
}

enum AuthType {
  API_KEY   // APIキー認証
  OAUTH     // OAuth認証
  NONE      // 認証なし
}
```

### 作成入力スキーマ

```typescript
// apps/manager/src/server/api/routers/v2/userMcpServer/index.ts
const CreateIntegratedMcpServerInputV2 = z.object({
  name: nameValidationSchema,
  description: z.string().optional(),
  templates: z
    .array(
      z.object({
        mcpServerTemplateId: z.string(),
        normalizedName: z.string(),
        toolIds: z.array(ToolIdSchema),
        envVars: z.record(z.string(), z.string()).optional(),
      }),
    )
    .min(2, "統合サーバーには2つ以上のテンプレートが必要です"),
});
```

### フロー状態型

```typescript
// apps/manager/src/atoms/integratedFlowAtoms.ts
type IntegratedFlowState = {
  // 選択された接続設定（McpServerTemplateInstance）のID配列
  selectedInstanceIds: string[];
  // 接続設定IDごとのツール選択状態（instanceId -> toolIds[]）
  toolSelections: Record<string, string[]>;
  // 統合サーバー名
  serverName: string;
  // 統合サーバー説明
  serverDescription: string;
  // 現在のステップ番号
  currentStep: number;
};
```

## 作成フロー詳細

### ステップ1: 接続設定を選択

- 既存の設定済み接続設定（McpServerTemplateInstance）を表示
- **2つ以上**の選択が必須
- 選択時にデフォルトで全ツールを選択状態にする

```typescript
const handleToggleInstance = (instanceId: string) => {
  if (flowState.selectedInstanceIds.includes(instanceId)) {
    // 削除: ツール選択もクリア
  } else {
    // 追加: デフォルトで全ツール選択
    const allToolIds = connectionConfig.tools.map((t) => t.id);
    updateFlowState({
      selectedInstanceIds: [...flowState.selectedInstanceIds, instanceId],
      toolSelections: {
        ...flowState.toolSelections,
        [instanceId]: allToolIds,
      },
    });
  }
};
```

### ステップ2: ツールを選択

- 各接続設定ごとに有効化するツールを選択
- **各接続設定で最低1つ**のツール選択が必須
- 全選択/全解除機能あり

### ステップ3: サーバー情報を入力

- 統合サーバー名（必須）
- 説明（任意）
- 選択したツール数のサマリー表示

### ステップ4: 確認

- 入力内容の最終確認
- 作成ボタンで `createIntegratedMcpServer` mutation 実行

## 作成ロジック詳細

```typescript
// apps/manager/src/server/api/routers/v2/userMcpServer/createIntegratedMcpServer.ts
export const createIntegratedMcpServer = async (
  prisma: PrismaTransactionClient,
  input: CreateIntegratedMcpServerInput,
  organizationId: string,
  userId: string,
): Promise<CreateIntegratedMcpServerOutput> => {
  // 1. テンプレート存在確認とツールのバリデーション
  // 2. 既存McpConfigのenvVars検索（envVarsが未指定の場合のみ再利用）
  // 3. MCPサーバー作成（serverType: CUSTOM, authType: OAUTH）
  // 4. McpServerTemplateInstance作成（allowedToolsをconnect）
  // 5. McpConfig作成（envVarsを設定）
};
```

### 重要なポイント

- **serverType: CUSTOM** - 統合サーバーは常にCUSTOM
- **authType: OAUTH** - 統合サーバーは常にOAuth認証
- **既存envVarsの再利用** - 同じテンプレートの既存インスタンスからenvVarsを取得可能
- **ツールのバリデーション** - 指定されたtoolIdsがテンプレートに存在するか確認

## 実装手順

### 新しい接続設定タイプの追加

1. `userMcpServer.prisma` でスキーマ更新（必要な場合）
2. `CreateIntegratedMcpServerInputV2` のスキーマを更新
3. `createIntegratedMcpServer.ts` の作成ロジックを更新
4. フロントエンドの該当コンポーネントを更新

### ツール選択ロジックの変更

1. `integratedFlowAtoms.ts` の型定義を更新（必要な場合）
2. `ToolSelector.tsx` のUIを更新
3. `prepareTemplateData.ts` のデータ変換ロジックを更新

### バックエンドロジックの変更

1. `createIntegratedMcpServer.ts` を編集
2. トランザクション内で必要な操作を追加
3. エラーハンドリングを適切に実装（TRPCError使用）

---

## 実装チェックリスト

### 新機能追加時

- [ ] スキーマ変更が必要な場合は `userMcpServer.prisma` を更新
- [ ] 入力スキーマ（`CreateIntegratedMcpServerInputV2`）を更新
- [ ] 作成ロジック（`createIntegratedMcpServer.ts`）を更新
- [ ] フロー状態型（`IntegratedFlowState`）を更新（必要な場合）
- [ ] フロントエンドコンポーネントを更新
- [ ] `pnpm typecheck` で型エラーなし
- [ ] `pnpm test` でテスト成功
- [ ] `pnpm build` でビルド成功

### 作成フロー変更時

- [ ] `CreateIntegratedPageClient.tsx` のステップ定義を更新
- [ ] `StepIndicator.tsx` のラベルを更新
- [ ] 新しいステップコンポーネントを追加（必要な場合）
- [ ] ステップ間のバリデーションロジックを更新

### デバッグ時

- [ ] フロー状態（`flowState`）の値をデバッグ出力
- [ ] tRPC mutation のエラーメッセージを確認
- [ ] バックエンドのバリデーションエラーを確認
- [ ] Prismaのトランザクションエラーを確認

---

## トラブルシューティング

### 「統合サーバーには2つ以上のテンプレートが必要です」エラー

1. `selectedInstanceIds` の長さを確認
2. ステップ1で2つ以上選択されているか確認
3. バリデーションロジック（`canProceedToStep2`）を確認

### 作成時に「無効なツールID」エラー

1. 選択されたツールIDがテンプレートに存在するか確認
2. `toolSelections` のデータが正しいか確認
3. `prepareTemplateData` の変換ロジックを確認

### envVarsが保存されない

1. 既存のMcpConfigからenvVarsを取得しているか確認
2. 新規envVarsが正しくJSON.stringifyされているか確認
3. McpConfig作成条件（`tmpl.envVars || existingEnvVars`）を確認

### OAuth認証が機能しない

1. `authType: OAUTH` が設定されているか確認
2. 関連するMcpOAuthClientが存在するか確認
3. テンプレートのOAuth設定を確認

## 活用のポイント

このスキルを活用することで：

- **効率的な統合サーバー開発**: フロー全体を理解して適切な箇所を修正
- **型安全な実装**: 型定義を参照して正確な実装
- **デバッグ効率化**: チェックリストとトラブルシューティングで問題を素早く解決
- **一貫性のあるUI**: 既存のステップ構造に沿った拡張
