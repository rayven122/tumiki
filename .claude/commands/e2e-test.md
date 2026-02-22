---
allowed-tools: Task, Bash, Read, Glob, Grep
description: "ブランチの差分を分析し、変更箇所に対してE2Eテストを実行"
---

# E2Eテストコマンド

現在のブランチの差分を分析し、変更された機能に対してPlaywright MCPでE2Eテストを実行します。

## 実行手順

1. **差分分析**: `git diff main...HEAD` で変更内容を取得
2. **テスト対象特定**: 変更ファイルから影響を受けるページ/機能を特定
3. **サーバー起動確認**: `pnpm dev` が起動中か確認（未起動なら起動）
4. **e2e-testerエージェント起動**: テスト実行

## 実行

```
Task tool:
- subagent_type: e2e-tester
- prompt: |
    1. git diff main...HEAD で変更内容を分析
    2. 変更に関連するページURLを特定
    3. pnpm dev が起動中か確認（http://localhost:3000 にアクセス）
    4. 各ページで動作検証を実行
    [追加の指示があれば記載]
```
