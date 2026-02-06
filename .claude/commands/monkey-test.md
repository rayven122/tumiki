---
allowed-tools: Task
description: "Playwright MCPを使用してモンキーテストと実装内容の動作検証を実行します"
---

## 実行

**`playwright-monkey-tester`エージェントを起動**:

```
Task tool:
- subagent_type: playwright-monkey-tester
- prompt: [url] でモンキーテストを実行。[実装内容の説明があれば追加]
```

**注意**: URLは必須パラメータです。
