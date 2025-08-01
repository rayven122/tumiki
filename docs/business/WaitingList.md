# Tumiki 最小限Waiting List機能実装概要

## システム概要

### 機能の範囲

Tumikiに最小限のWaiting List機能を追加します。ユーザーが登録ボタンをクリック→情報入力→データベース保存→登録完了メール送信という基本的なフローのみを実装します。

### 技術スタック（既存環境活用）

- **フロントエンド**: Next.js 15 + React 19 + tRPC + Tailwind CSS + Radix UI
- **バックエンド**: tRPC API Routes
- **データベース**: PostgreSQL + Prisma
- **メール**: Nodemailer
- **モノレポ**: 既存のTurbo + pnpm構成

## 実装する機能

### 1. 登録フォーム

**基本フロー**

- 「Waiting Listに登録」ボタン
- モーダルまたは専用ページでの情報入力
- メールアドレス（必須）+ 名前（任意）
- 送信ボタンクリック

**UI実装**

- Radix UIのDialogコンポーネント使用
- フォームバリデーション（メールアドレス形式チェック）
- 送信中の状態表示
- 成功・エラーメッセージ

### 2. データ保存

**データベーステーブル**

```
WaitingList {
  - id: 主キー
  - email: メールアドレス（ユニーク）
  - name: 名前（任意）
  - createdAt: 登録日時
}
```

**重複チェック**

- 同じメールアドレスでの重複登録防止
- エラーメッセージの表示

### 3. 登録完了メール送信

**メール内容**

- 件名：「Waiting List登録完了」
- 登録いただいたメールアドレスの確認
- サービス開始時の連絡予定の案内
- シンプルなHTMLテンプレート

**送信処理**

- データベース保存成功後に自動送信
- 送信失敗時のエラーハンドリング

## ファイル構成

### 最小限の実装ファイル

```
apps/manager/src/
├── app/
│   └── (dashboard)/                 # 既存ダッシュボードに統合
│       └── page.tsx                 # 登録ボタンを追加
├── components/
│   └── waitingList/
│       ├── RegistrationDialog.tsx   # 登録モーダル
│       └── RegistrationForm.tsx     # フォーム部分
├── server/api/routers/
│   └── waitingList.ts               # API実装
└── lib/
    └── email.ts                     # メール送信
```

### データベーススキーマ

```
packages/db/prisma/schema/
└── waitingList.prisma               # シンプルなテーブル定義
```

## API設計

### tRPC実装

**単一エンドポイント**

- `waitingList.register` - 登録処理のみ

**入力データ**

```typescript
{
  email: string;    // 必須、メール形式
  name?: string;    // 任意
}
```

**処理フロー**

1. 入力バリデーション
2. 重複チェック
3. データベース保存
4. メール送信
5. 成功レスポンス

## 環境変数

### 追加する設定

```bash
# メール送信設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourdomain.com
```

## データベース設計

### 最小限のスキーマ

```prisma
model WaitingList {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())

  @@map("waiting_list")
}
```

### マイグレーション

```bash
cd packages/db
pnpm db:migrate
```

## 実装手順

### 1. データベーススキーマ作成

- `waitingList.prisma`ファイル追加
- マイグレーション実行

### 2. tRPC API実装

- 登録エンドポイント作成
- バリデーション・エラーハンドリング

### 3. メール送信機能

- Nodemailer設定
- HTMLテンプレート作成

### 4. フロントエンド実装

- 登録ダイアログコンポーネント
- 既存ページへの統合

### 5. 環境変数設定

- SMTP設定追加
- 本番環境での設定

## エラーハンドリング

### 想定するエラーケース

- 重複メールアドレス → 「既に登録済みです」
- 無効なメール形式 → 「正しいメールアドレスを入力してください」
- メール送信失敗 → 「登録は完了しましたが、確認メールの送信に失敗しました」
- データベースエラー → 「登録に失敗しました。しばらく後に再試行してください」

### ユーザーフィードバック

- 成功時：「登録が完了しました。確認メールをお送りしました」
- エラー時：具体的なエラーメッセージ表示
- ローディング状態：スピナー表示

## セキュリティ対策

### 基本的な保護

- tRPC + Zodによる入力検証
- メールアドレス形式の厳密チェック
- レート制限（同一IPからの連続投稿防止）
- CSRF保護（Next.js標準）

## テスト

### 確認項目

- 正常な登録フロー
- 重複登録の防止
- メール送信の動作確認
- バリデーションエラーの表示
- ネットワークエラー時の動作

## 運用・監視

### 最小限の監視

- 登録数の確認（データベース直接参照）
- メール送信エラーのログ確認
- 重複登録試行の監視

## 将来の拡張性

### 後から追加可能な機能

- 管理画面での登録者一覧
- 一括招待メール送信
- 登録確認フロー
- 統計・分析機能
- 組織レベルでの分離

この最小限の実装により、基本的なWaiting List機能を素早く導入し、ユーザーフィードバックを収集してから段階的に機能を拡張できます。
