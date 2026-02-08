---
allowed-tools: Bash(ccmanager:*)
description: "複数のLinear IssueをCCManagerで並列実装"
---

## 引数

- **`<Issue ID...>`**: 対象のLinear Issue ID（複数指定可能）
  - 例: `TUM-123 TUM-456 TUM-789`

## 実行フロー

### 1. CCManagerでセッション作成

各Issueに対してセッションを作成し、`/issue-to-pr`を自動実行:

```bash
ccmanager new TUM-123 --prompt "/issue-to-pr TUM-123"
ccmanager new TUM-456 --prompt "/issue-to-pr TUM-456"
ccmanager new TUM-789 --prompt "/issue-to-pr TUM-789"
```

### 2. 実行状況の案内

```
=== セッション作成完了 ===

セッション一覧:  ccmanager list
アタッチ:        ccmanager attach TUM-123
削除:            ccmanager delete TUM-123
```

## 実行例

```bash
# 3つのIssueを並列処理
/batch-issues TUM-123 TUM-456 TUM-789
```
