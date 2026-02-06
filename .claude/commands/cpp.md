---
allowed-tools: Task
description: "コミット・プッシュ・PR作成を一括実行"
---

## 実行

**`commit-and-pr`エージェントを起動**:

```
Task tool:
- subagent_type: commit-and-pr
- prompt: 変更をコミットしてPRを作成
```
