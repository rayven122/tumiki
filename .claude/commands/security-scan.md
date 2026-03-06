---
allowed-tools: Task
description: "依存関係脆弱性チェックとコードセキュリティ分析"
---

## 実行

```
Task tool:
- subagent_type: security-scanner
- prompt: セキュリティスキャンを実行（依存関係 + コード）
```

## 出力内容

- 依存関係脆弱性（Critical/High/Medium/Low）
- コードセキュリティ問題
- 推奨アクション
