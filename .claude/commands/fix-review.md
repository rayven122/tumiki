---
allowed-tools: Bash(git:*), Bash(gh:*), Task
description: "PRレビューコメントを分析し一括対応する自動化コマンド"
---

## 引数

- **`<PR番号>`**: 対象のPR番号（必須）
- **`--dry-run`**: 修正計画のみ表示（実際の変更なし）
- **`--no-test`**: テスト作成をスキップ

## 実行フロー

### 1. レビューコメント分析

```
Task tool:
- subagent_type: review-analyzer
- prompt: PR #<番号> のレビューコメントを分析して修正計画を作成
```

**計画をユーザーに提示し、確認後に次へ**

### 2. コード修正（Agent Team並列）

各コメントに対してimplementerを並列起動:

```
Agent Team:
- implementer: コメント1 (src/utils/auth.ts:45 バリデーション追加)
- implementer: コメント2 (src/api/user.ts:23 エラーハンドリング)
- implementer: コメント3 (src/components/Form.tsx:78 useCallback追加)
```

### 3. テスト作成（Agent Team並列、`--no-test`以外）

テスト追加指摘がある場合、unit-test-writerを並列起動:

```
Agent Team:
- unit-test-writer: テスト1 (src/utils/auth.test.ts)
- unit-test-writer: テスト2 (src/api/user.test.ts)
```

### 4. コミット・プッシュ

```
Task tool:
- subagent_type: commit-and-pr
- prompt: レビューコメント対応をコミット・プッシュ（PR #<番号>）
```

### 5. コメント返信

対応したコメントに修正内容の詳細を含めて返信:

```bash
gh api repos/{owner}/{repo}/pulls/<PR番号>/comments/<id>/replies \
  -f body="修正しました。

**対応内容:**
- [具体的な修正内容を記載]
- [変更したファイル・行番号]
- [採用したアプローチの説明]"
```

## コマンド・エージェント連携図

```
/fix-review (リーダー)
    │
    ├── review-analyzer（分析・計画作成）
    │
    ├── Agent Team（コード修正）
    │   ├── implementer（コメント1）
    │   ├── implementer（コメント2）
    │   └── implementer（コメント3）
    │
    ├── Agent Team（テスト作成）※指摘時のみ
    │   ├── unit-test-writer（テスト1）
    │   └── unit-test-writer（テスト2）
    │
    ├── commit-and-pr（コミット・プッシュ）
    │
    └── コメント返信（gh api）
```
