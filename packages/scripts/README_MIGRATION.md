# WaitingList データ移行ガイド

## 概要

WaitingListテーブルのデータをJSONファイルから読み込んでデータベースに移行するためのスクリプトです。

## 使用方法

### 基本的な使用方法

```bash
# packages/scripts ディレクトリで実行
cd packages/scripts

# 移行実行（本番）
pnpm migrateWaitingList data/waitingList.json

# ドライラン（実際の挿入は行わず、処理内容を確認のみ）
pnpm migrateWaitingList data/waitingList.json --dry-run

# 重複チェックを無効にする場合
pnpm migrateWaitingList data/waitingList.json --no-skip-duplicates
```

### オプション

- `--dry-run`: 実際の挿入を行わず、処理内容のみ表示
- `--no-skip-duplicates`: 重複するemail addressでもエラーにせずスキップする機能を無効化

## JSONファイル形式

### 必須フィールド

- `email` (string): メールアドレス（必須、ユニーク）

### オプションフィールド

- `id` (string): 既存のID（未指定の場合は自動生成）
- `name` (string | null): ユーザー名
- `company` (string | null): 会社名
- `useCase` (string | null): 利用目的
- `createdAt` (string): 作成日時（ISO 8601形式、未指定の場合は現在時刻）

### サンプルファイル

`data/waitingList.example.json` を参考にしてください。

```json
[
  {
    "id": "cm5xyz123",
    "email": "user1@example.com",
    "name": "田中太郎",
    "company": "株式会社サンプル",
    "useCase": "AIアシスタントの開発",
    "createdAt": "2024-12-01T10:00:00.000Z"
  },
  {
    "email": "user2@example.com",
    "name": "佐藤花子",
    "company": null,
    "useCase": "個人プロジェクト"
  }
]
```

## 処理の流れ

1. JSONファイルの読み込み
2. 既存データとの重複チェック（email基準）
3. バッチ処理によるデータ挿入（デフォルト100件ずつ）
4. 結果の出力（処理済み件数、スキップ件数、エラー件数）

## エラーハンドリング

- **重複email**: スキップ（`--no-skip-duplicates`オプションでエラーに変更可能）
- **バッチエラー**: 個別挿入にフォールバック
- **JSONファイルエラー**: プロセス終了

## ログ出力例

```
=== WaitingList データ移行開始 ===
JSONファイル: data/waitingList.json
重複スキップ: true
ドライラン: false
バッチサイズ: 100

読み込みデータ数: 250
スキップ: user1@example.com (既に存在)
バッチ 1: 100 件挿入完了
バッチ 2: 100 件挿入完了
バッチ 3: 49 件挿入完了

=== 移行完了 ===
処理済み: 249 件
スキップ: 1 件
エラー: 0 件
合計: 250 件
```

## 注意事項

- 本番環境での実行前に必ず `--dry-run` オプションで内容を確認してください
- 大量データの場合はバッチサイズ（デフォルト100）を調整することで性能を最適化できます
- 既存データとの重複を避けるため、emailの一意性を事前に確認してください
