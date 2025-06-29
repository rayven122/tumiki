---
allowed-tools: Bash(git:*), Bash(gh:*)
description: "ステージされた変更をコミットし、PRを作成して概要を更新する自動化コマンド"
---

現在ステージされているgitの変更を分析し、適切なコミットメッセージを生成してコミット、プッシュ、PR作成まで自動実行してください。

## 実行手順

1. **Git状態の確認と分析**

   - 現在のブランチとステージされた変更を確認
   - 変更されたファイルの種類を分析してコミットタイプを決定

2. **コミットメッセージの自動生成ルール**

   - 新規ファイルのみ → `feat:`
   - 既存ファイル修正のみ → `fix:`
   - ファイル削除あり → `refactor:`
   - ドキュメントファイル(.md) → `docs:`
   - テストファイル → `test:`
   - 設定ファイル(package.json等) → `chore:`

3. **コミット実行**

   - 以下の形式でコミットメッセージを作成：

   ```
   [type]: [変更の概要]

   🤖 Generated with [Claude Code](https://claude.ai/code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

4. **プッシュとPR作成**
   - リモートブランチにプッシュ（必要に応じて上流ブランチを設定）
   - GitHub CLIを使用してPR作成
   - PR本文には変更概要、ファイル一覧、テストプランを含める

## コンテキスト取得

現在のgit状態とブランチ情報を取得:
!`git status`
!`git diff --cached --name-status`
!`git branch --show-current`
!`git log --oneline -3`

## 前提条件

- 変更がgit addでステージされていること
- GitHub CLI (gh) がインストール・認証済みであること
- リモートリポジトリが設定されていること

## エラーハンドリング

- ステージされた変更がない場合は処理を停止
- GitHub CLI未インストールの場合は手動PR作成のURL表示
- プッシュ失敗時は上流ブランチ設定を試行
