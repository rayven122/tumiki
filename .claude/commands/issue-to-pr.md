---
allowed-tools: Bash(git:*), Task, Skill
description: "Linear Issueから実装・PR作成まで自動実行"
---

## 引数

- **`<Linear URL または Issue ID>`**: 対象のLinear Issue（必須）
  - URL形式: `https://linear.app/workspace/issue/XXX-123/issue-title`
  - ID形式: `XXX-123`
- **`--no-test`**: テスト作成をスキップ

## 実行フロー

### 1. 実装計画作成

```
Skill tool:
- skill: plan-issue
- args: <Linear URL または Issue ID>
```

**ユーザーに計画を確認後、次のステップへ**。

### 2. ブランチ作成

/plan-issueが提示したブランチ名を使用:

```bash
git checkout -b <branchName from Linear>
```

### 3. 実装

**単一機能の場合**:

```
Task tool:
- subagent_type: implementer
- prompt: |
    ## 実装計画
    [issue-plannerの計画を貼り付け]

    ## 担当機能
    [機能名と概要]

    ## 担当ファイル
    - path/to/file1.ts
    - path/to/file2.ts
```

**複数の独立機能の場合**: Agent Teamで並列実装

```
Create an agent team for parallel implementation:
- 各implementerに担当機能・ファイルを明示的に指定
- 各implementer内でコード簡素化・品質チェックまで完結
```

**依存関係がある機能の場合**: 順次実行

```
1. 共通機能をimplementerで実装（完了を待つ）
2. 依存機能をimplementerで実装
```

**各implementerの処理:**
1. コード実装
2. tumiki-code-simplifier（簡素化）
3. code-quality-enhancer（品質チェック）

### 4. テスト作成（`--no-test`以外）

**単一機能の場合**:

```
Task tool:
- subagent_type: unit-test-writer
- prompt: |
    ## テスト対象
    [実装した機能の概要]

    ## 対象ファイル
    - path/to/implementation.ts

    ## テストファイル
    - path/to/implementation.test.ts
```

**複数の独立機能の場合**: Agent Teamで並列作成

```
Create an agent team for parallel test writing:
- 各unit-test-writerに担当機能・ファイルを明示的に指定
- 各unit-test-writer内でテスト簡素化・品質チェックまで完結
```

**各unit-test-writerの処理:**
1. テスト作成
2. tumiki-code-simplifier（簡素化）
3. code-quality-enhancer（品質チェック）

### 5. PR作成

```
Task tool:
- subagent_type: commit-and-pr
- prompt: 変更をコミットしてPRを作成
```

コンテキスト分離のため、エージェント直接呼び出し。結果（PR URL）のみ返される。

## Agent Team活用指針

- **並列化の判断**: 複数の**独立した**機能がある場合のみAgent Team使用
- **依存関係がある場合**: Agent Teamを使わず順次実行
- **コンテキスト受け渡し**: promptに計画・担当機能・担当ファイルを明示
- **品質完結**: 各エージェントは簡素化・品質チェックまで完了させる
- **クリーンアップ**: 各フェーズ完了後にチームをクリーンアップ

## コマンド・エージェント連携図

```
/issue-to-pr (リーダー)
    │
    ├── /plan-issue（計画作成）
    │
    ├── [実装フェーズ]
    │   ├── 単一機能 → implementer（直接実行）
    │   ├── 複数独立機能 → Agent Team
    │   │   ├── implementer（機能A）
    │   │   └── implementer（機能B）
    │   └── 依存機能 → 順次実行
    │       ├── implementer（共通機能）← 先に完了
    │       └── implementer（依存機能）← 後に実行
    │
    ├── [テストフェーズ]
    │   ├── 単一機能 → unit-test-writer（直接実行）
    │   └── 複数独立機能 → Agent Team
    │       ├── unit-test-writer（機能Aテスト）
    │       └── unit-test-writer（機能Bテスト）
    │
    └── commit-and-pr（直接呼び出し、コンテキスト分離）
```
