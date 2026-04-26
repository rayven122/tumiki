---
name: check-pr
description: |
  PRのCIステータスとレビューコメントを確認するスキル。
  PR作成後・push後に使用。CIが全て通っているか、レビューコメントに問題がないかをチェックする。
---

# PR チェック

## 実行フロー

### 1. 対象PR番号の特定

引数でPR番号が指定された場合はそれを使用。指定がない場合は現在のブランチから自動取得:

```bash
gh pr view --json number --jq '.number'
```

### 2. CIステータス確認

```bash
gh pr checks <PR番号> --repo rayven122/tumiki
```

**判定基準:**
- `pass` / `success`: ✅ 通過
- `pending` / `queued`: ⏳ 実行中（完了まで待機してから再確認）
- `fail`: ❌ 失敗（失敗ログを取得して原因を報告）

CIがまだ pending の場合は **60秒待ってから再確認**を繰り返す（最大10回）。

失敗したジョブのログ取得:
```bash
gh run view <run-id> --log-failed
```

### 3. レビューコメント確認

```bash
gh pr view <PR番号> --repo rayven122/tumiki --json reviews,comments
```

**確認内容:**
- レビューコメント（`reviews`）の `state`: `APPROVED` / `CHANGES_REQUESTED` / `COMMENTED`
- インラインコメント（`comments`）の内容
- Bot（claudeなど）のコメントは自動生成として参照する程度でよい
- `CHANGES_REQUESTED` がある場合は内容を要約して報告

### 4. 結果報告

以下の形式でまとめて報告する:

```
## PR #XXX チェック結果

### CI
| ジョブ名 | ステータス |
|---------|-----------|
| Format  | ✅ pass   |
| Lint    | ✅ pass   |
| ...     | ...       |

### レビュー
- 承認: X件
- 変更要求: X件（ある場合は内容を列挙）
- コメント: X件（重要なものを列挙）
```

## エラー対応

- **Typecheck失敗**: `pnpm typecheck` でローカル再現 → 修正 → push
- **Lint失敗**: `pnpm lint:fix` でローカル修正 → push
- **Build失敗**: エラーログを確認して原因特定
- **Test失敗**: `pnpm test` でローカル再現
