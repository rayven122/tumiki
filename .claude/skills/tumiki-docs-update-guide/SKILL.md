---
name: tumiki-docs-update-guide
description: |
  機能実装後のドキュメント（スキル、CLAUDE.md）更新を支援するガイド。
  変更検出、スキル更新のタイミング・手順、コード例の書き方を提供。
  「ドキュメント更新」「スキル更新」「CLAUDE.md修正」などのリクエスト時にトリガー。
sourcePatterns:
  - .claude/skills/**
  - CLAUDE.md
---

# ドキュメント更新ガイド

## スキルと対応ソースコードの一覧

各スキルには `sourcePatterns` が定義されており、対応するソースファイルが変更された場合にスキルの更新が必要になります。

| スキル名 | 対応パターン |
|----------|-------------|
| tumiki-custom-mcp-server-feature | `packages/db/prisma/schema/userMcpServer.prisma`, `apps/manager/src/server/api/routers/v2/userMcpServer/**`, `apps/manager/src/atoms/integratedFlowAtoms.ts`, `apps/manager/src/app/**/mcps/create-integrated/**` |
| tumiki-dynamic-search-feature | `apps/mcp-proxy/src/features/dynamicSearch/**`, `apps/mcp-proxy/src/features/mcp/mcpRequestHandler.ts`, `apps/mcp-proxy/src/features/mcp/commands/callTool/callToolCommand.ts` |
| tumiki-mcp-proxy-architecture | `apps/mcp-proxy/src/domain/**`, `apps/mcp-proxy/src/features/**`, `apps/mcp-proxy/src/infrastructure/**`, `apps/mcp-proxy/src/shared/**` |
| tumiki-prisma-schema-changes | `packages/db/prisma/schema/*.prisma` |

## 変更検出の手順

### 1. 変更されたファイルを確認

```bash
# 最新5コミットの変更ファイル
git diff --name-only HEAD~5

# mainブランチからの変更
git diff --name-only main

# 特定のコミットからの変更
git diff --name-only <commit-hash>
```

### 2. 対応スキルの特定

変更されたファイルと上記の `sourcePatterns` を照合し、更新が必要なスキルを特定。

### 3. コード例の差分確認

スキル内のコード例と実際のソースコードを比較し、乖離がないか確認。

```bash
# 例: スキーマ定義の確認
grep -A 10 "CreateIntegratedMcpServerInputV2" apps/manager/src/server/api/routers/v2/userMcpServer/index.ts
```

## スキル更新のタイミング

### 必ず更新が必要な変更

- **スキーマ定義の変更**: Enum、型定義、入力スキーマなど
- **API/関数シグネチャの変更**: 引数、戻り値の型変更
- **ファイル構成の変更**: ディレクトリ構造、ファイル名の変更
- **主要なロジックの変更**: 処理フローの変更

### 更新が推奨される変更

- **新機能の追加**: チェックリストへの項目追加
- **バグ修正**: トラブルシューティングセクションへの追加
- **パフォーマンス改善**: 実装詳細の更新

### 更新不要な変更

- **コメントのみの変更**
- **リファクタリング（外部インターフェース変更なし）**
- **テストコードの変更**

## スキル更新の手順

### 1. 該当スキルを開く

```
.claude/skills/<skill-name>/SKILL.md
```

### 2. frontmatter を確認

`sourcePatterns` が正しく設定されているか確認。

```yaml
---
description: スキルの説明
sourcePatterns:
  - packages/db/prisma/schema/*.prisma
  - apps/manager/src/**/*.ts
---
```

### 3. コード例を更新

実際のソースコードからコード例をコピーし、スキルに反映。

**コード例の書き方ガイドライン：**

- 完全なコードではなく、理解に必要な部分のみ抜粋
- ファイルパスをコメントで明記
- 型定義は省略せず記載
- 変更しやすい部分（例: バリデーションメッセージ）も含める

```typescript
// apps/manager/src/server/api/routers/v2/userMcpServer/index.ts
const CreateIntegratedMcpServerInputV2 = z.object({
  name: nameValidationSchema,
  description: z.string().optional(),
  templates: z
    .array(/* ... */)
    .min(2, "統合サーバーには2つ以上のテンプレートが必要です"),
});
```

### 4. チェックリストを更新

新しい確認事項があれば追加。

### 5. トラブルシューティングを更新

発見した問題と解決方法を追記。

## CLAUDE.md 更新の指針

### 更新が必要な場合

- 新しい主要機能の追加
- 開発コマンドの追加・変更
- アーキテクチャの大きな変更
- トラブルシューティング項目の追加

### 更新箇所

| セクション | 更新タイミング |
|-----------|---------------|
| 主要な開発コマンド | 新しいnpm scriptの追加時 |
| 開発ガイドライン | コーディング規約の追加・変更時 |
| 重要なアーキテクチャパターン | 新しいアーキテクチャパターンの導入時 |
| トラブルシューティング | 新しい問題と解決方法の発見時 |
| 機能セクション（統合MCP、Dynamic Search等） | 該当機能の変更時 |

## 新しいスキル作成のガイドライン

### スキルを作成すべき場合

- 複雑な機能で、複数のファイルにまたがる実装がある
- 繰り返し参照される実装パターンがある
- デバッグやトラブルシューティングの知識が蓄積されている

### スキルの構成

```markdown
---
name: skill-name
description: |
  スキルの説明（1-2文）。トリガー条件を含める。
  「キーワード1」「キーワード2」などのリクエスト時にトリガー。
sourcePatterns:
  - 対応するソースファイルパターン
---

# スキル名

## アーキテクチャ概要
（全体像の説明）

## コンポーネント構成
（ファイル構成）

## 型定義
（主要な型）

## 実装詳細
（コード例付きの詳細説明）

## 実装チェックリスト
（確認事項）

## トラブルシューティング
（よくある問題と解決方法）
```

**重要**:
- `name` フィールドは必須
- トリガー条件は `description` に含める（bodyに「このスキルを使用する場面」セクションは不要）

### sourcePatterns の書き方

```yaml
sourcePatterns:
  # 単一ファイル
  - packages/db/prisma/schema/userMcpServer.prisma

  # ディレクトリ内の全ファイル
  - apps/mcp-proxy/src/features/dynamicSearch/**

  # 特定の拡張子
  - packages/db/prisma/schema/*.prisma

  # 複数階層のワイルドカード
  - apps/manager/src/app/**/mcps/create-integrated/**
```

## 実装完了後のチェックリスト

機能実装が完了したら、以下を確認：

- [ ] 変更したファイルが既存スキルの `sourcePatterns` に該当するか確認
- [ ] 該当する場合、スキルのコード例が最新か確認
- [ ] スキーマや型定義の変更がある場合、スキルを更新
- [ ] 新しい機能の場合、CLAUDE.md への追加を検討
- [ ] 新しいトラブルシューティング項目があれば追記

## よくある質問

### Q: スキルの更新を忘れた場合どうなる？

スキル内のコード例と実際の実装が乖離し、参照時に混乱を招きます。
定期的に `/tumiki-docs-update-guide` スキルを参照して確認してください。

### Q: どの程度の変更でスキルを更新すべき？

外部から見える変更（型定義、API、ファイル構成）は必ず更新。
内部ロジックのみの変更は任意です。

### Q: 新しいスキルを作成すべきか、既存を拡張すべきか？

- 既存スキルの範囲内 → 既存を拡張
- 独立した新機能 → 新しいスキルを作成
- 迷う場合 → 既存を拡張し、大きくなったら分割
