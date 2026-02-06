---
allowed-tools: Bash, Glob, Grep, Read, mcp__linear__get_issue
description: "Linear Issueから実装計画を作成"
---

## 引数

- **`<Linear URL または Issue ID>`**: 対象のLinear Issue（必須）
  - URL形式: `https://linear.app/workspace/issue/XXX-123/issue-title`
  - ID形式: `XXX-123`

## 参照すべきリソース

- **CLAUDE.md**: プロジェクトのコーディング規約、アーキテクチャ、ディレクトリ構成
- **tumiki-api-patterns スキル**: tRPC API設計パターン
- **tumiki-testing-patterns スキル**: テスト設計パターン

## 実行フロー

### 1. Linear Issue情報取得

**`mcp__linear__get_issue`** を使用してIssue情報を取得:

- title, description, branchName, labels, priority, state

### 2. Issue検証

以下を検証し、問題があれば報告:

- Issue IDが有効か
- descriptionが十分な情報を含むか
- branchNameが存在するか

### 3. コードベース分析

Issueの要件に基づいて、関連するコードを調査:

- 変更対象となるファイル・コンポーネント
- 既存の類似実装パターン
- 影響を受ける依存関係

### 4. 実装計画作成

以下の形式で実装計画を提示:

```markdown
## 実装計画: [Issue Title]

### 概要
[Issueの要約と実装のゴール]

### 変更対象ファイル
1. `path/to/file1.ts` - [変更内容]
2. `path/to/file2.ts` - [変更内容]

### 実装ステップ
1. [ステップ1の説明]
2. [ステップ2の説明]

### テスト方針
- [テストすべき項目]

### 考慮事項
- [エッジケース、互換性、セキュリティ]

### ブランチ名
`[branchName from Linear]`
```

### 5. ユーザー確認

計画を提示し、ユーザーの承認を待つ。

## 重要なガイドライン

1. **具体的な計画**: 抽象的な説明ではなく、具体的なファイルパスと変更内容を提示
2. **既存パターンの活用**: コードベースの既存パターンに従った実装を提案
3. **テスト方針の明確化**: 何をテストすべきか具体的に提示
4. **リスクの特定**: 実装に伴うリスクや注意点を明示
