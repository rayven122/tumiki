---
description: `.issues/` ディレクトリに新しい issue ファイルを作成・管理するためのスキル。Issue の作成、テンプレート、severity/difficulty の判定基準、ライフサイクル管理を提供。
user-invocable: true
---

# Issue Tracker スキル

このスキルは、プロジェクトの issue を `.issues/` ディレクトリで管理するためのガイドラインを提供します。

## Issue ファイルの作成

### ファイル命名規則

- **形式**: ケバブケース（kebab-case）
- **説明的な名前**: 問題の内容が分かる名前を使用
- **例**: `mcp-connection-pool-timeout.md`, `missing-error-handling.md`

### 保存場所

```
.issues/
├── security-api-key-exposure.md
├── cache-invalidation-race-condition.md
└── missing-rate-limiting.md
```

## Issue テンプレート

新しい issue を作成する際は、以下のテンプレートを使用してください：

```yaml
---
apps:
  - mcp-proxy  # 対象アプリ（複数可: manager, mcp-proxy など）
severity: medium  # high / medium / low
difficulty: medium  # high / medium / low
---

# [Issue タイトル]

## 概要

[問題の簡潔な説明]

## 重大度

[high / medium / low を選択した理由を説明]

## 影響範囲

- `apps/mcp-proxy/src/path/to/file.ts`
- `packages/xxx/src/path/to/file.ts`

## 詳細

### 現状

[現在のコードがどのように動作しているか]

### 問題点

1. **問題1**: 説明
2. **問題2**: 説明

### 影響

- **パフォーマンス**: [影響の説明、または「なし」]
- **セキュリティ**: [影響の説明、または「なし」]
- **信頼性**: [影響の説明、または「なし」]
- **保守性**: [影響の説明、または「なし」]

## 推奨される対策

1. **対策1**

   [対策の説明]

   ```typescript
   // 推奨されるコード例
   ```

2. **対策2**

   [対策の説明]

## 関連ファイル

- `apps/mcp-proxy/src/path/to/file.ts`
- `packages/xxx/src/path/to/file.ts`

## 参考資料

- [関連ドキュメントへのリンク]
- [外部リソースへのリンク]
```

## 判定基準

### severity（重大度）

| レベル | 基準 | 例 |
|--------|------|-----|
| **high** | セキュリティ脆弱性、データ損失リスク、サービス停止の可能性 | API キーの漏洩、SQL インジェクション、認証バイパス |
| **medium** | パフォーマンス低下、ユーザー体験への影響、保守性の問題 | メモリリーク、レースコンディション、タイムアウト設定不備 |
| **low** | コード品質、ドキュメント不足、軽微な問題 | 型定義の不備、コメント不足、命名規則違反 |

### difficulty（修正難易度）

| レベル | 基準 | 例 |
|--------|------|-----|
| **high** | 設計変更が必要、複数ファイルの大規模修正、外部サービス連携 | アーキテクチャ変更、認証フロー変更、DB スキーマ変更 |
| **medium** | 既存パターンの適用、中程度の修正量 | 新しいバリデーション追加、エラーハンドリング改善 |
| **low** | 設定変更、小規模な修正、ドキュメント更新 | 環境変数追加、ログ追加、型定義修正 |

## Issue カテゴリ

issue は以下のカテゴリに分類できます：

| カテゴリ | 説明 |
|----------|------|
| **security** | セキュリティに関する問題 |
| **performance** | パフォーマンスに関する問題 |
| **reliability** | 信頼性・可用性に関する問題 |
| **maintainability** | 保守性・コード品質に関する問題 |
| **configuration** | 設定・環境変数に関する問題 |
| **documentation** | ドキュメントに関する問題 |

## Issue のライフサイクル

### 1. 作成

1. このスキル（`/issue-tracker`）を使用して新しい issue を作成
2. テンプレートに従って情報を入力
3. `.issues/` ディレクトリに保存

### 2. 作業中

- issue ファイルは修正作業中も `.issues/` に残す
- 必要に応じて issue ファイルを更新（進捗、新しい発見など）

### 3. 解決

issue が解決したら、以下の手順で対応：

1. **issue ファイルの削除**: 修正コミットと同時に関連する issue ファイルを削除

2. **コミットメッセージ**: 解決した issue を記載
   ```
   fix: MCP接続プールのタイムアウト処理を改善

   - タイムアウト時のクリーンアップ処理を追加
   - 再接続ロジックを実装

   Resolves: mcp-connection-pool-timeout.md
   ```

3. **PR 説明**: 解決した issue を記載
   ```markdown
   ## 解決した Issue

   - `.issues/mcp-connection-pool-timeout.md`
   ```

## 使用例

### 新しい issue を作成する場合

1. `/issue-tracker` を実行
2. 問題の詳細をヒアリング
3. テンプレートに従って issue ファイルを作成
4. `.issues/` ディレクトリに保存

### 既存の issue を確認する場合

```bash
# issue 一覧を確認
ls -la .issues/

# 特定の issue を確認
cat .issues/issue-name.md
```

### issue を解決した場合

```bash
# issue ファイルを削除
rm .issues/issue-name.md

# コミット
git add .
git commit -m "fix: 問題を修正

Resolves: issue-name.md"
```

## 注意事項

- issue ファイルは必ず `.issues/` ディレクトリに保存すること
- severity と difficulty は必ず設定すること
- 影響範囲には具体的なファイルパスを記載すること
- 推奨される対策には可能な限りコード例を含めること
