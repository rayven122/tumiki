# Stripe 開発環境セットアップガイド

このガイドでは、Tumiki ManagerでStripe決済機能を開発するための環境セットアップ手順を説明します。

## 前提条件

- Node.js 22.14.0以上
- pnpm 9.6.0以上
- Stripeアカウント（テストモード）

## 1. Stripeアカウントの準備

### 1.1 アカウント作成

1. [Stripe](https://stripe.com/jp)にアクセスしてアカウントを作成
2. ダッシュボードにログイン
3. テストモードに切り替え（画面右上のトグルスイッチ）

### 1.2 APIキーの取得

1. ダッシュボード → 開発者 → APIキー
2. 以下のキーをコピー：
   - 公開可能キー（`pk_test_`で始まる）
   - シークレットキー（`sk_test_`で始まる）

## 2. 環境変数の設定

### 2.1 .envファイルの設定

プロジェクトルートの`.env`ファイルに以下を追加：

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_あなたのシークレットキー
STRIPE_WEBHOOK_SECRET=whsec_あなたのWebhookシークレット（後述）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_あなたの公開可能キー

# Stripe Configuration Options
STRIPE_API_VERSION=2024-11-20.acacia
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2.2 環境変数の検証

```bash
pnpm verify:stripe
```

このコマンドですべての環境変数が正しく設定されているか確認できます。

## 3. Webhookの設定

### 3.1 Stripe CLIのインストール

#### macOS (Homebrew)
```bash
brew install stripe/stripe-cli/stripe
```

#### Windows (Scoop)
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

#### Linux
[Stripe CLIのリリースページ](https://github.com/stripe/stripe-cli/releases)から直接ダウンロード

### 3.2 Stripe CLIのログイン

```bash
stripe login
```

ブラウザが開くので、Stripeアカウントでログインして認証を完了します。

### 3.3 Webhookエンドポイントの作成

#### 開発環境（ローカル）

開発環境では、Stripe CLIを使用してWebhookをローカルに転送します：

```bash
# 別のターミナルで実行
pnpm stripe:listen
```

または直接実行：

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

このコマンドを実行すると、Webhook署名シークレット（`whsec_`で始まる）が表示されます。
これを`.env`ファイルの`STRIPE_WEBHOOK_SECRET`に設定してください。

#### 本番環境

1. Stripeダッシュボード → 開発者 → Webhook
2. 「エンドポイントを追加」をクリック
3. エンドポイントURL: `https://あなたのドメイン/api/webhooks/stripe`
4. リッスンするイベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. 作成後、署名シークレットをコピー

## 4. Customer Portalの設定

1. Stripeダッシュボード → 設定 → Billing → Customer portal
2. 「Customer portalを有効化」をクリック
3. 以下の設定を有効化：
   - ✅ 顧客が支払い方法を更新できる
   - ✅ 顧客がサブスクリプションをキャンセルできる
   - ✅ 顧客が請求履歴を確認できる
   - ✅ 顧客がプランを変更できる
4. 言語設定で「日本語」を選択
5. 「保存」をクリック

## 5. 開発フロー

### 5.1 開発サーバーの起動

```bash
# ターミナル1: Next.jsサーバー
pnpm dev

# ターミナル2: Stripe Webhook転送
pnpm stripe:listen
```

### 5.2 テスト用カード番号

Stripeテストモードでは以下のテスト用カード番号が使用できます：

- **成功するカード**: `4242 4242 4242 4242`
- **認証が必要なカード**: `4000 0025 0000 3155`
- **拒否されるカード**: `4000 0000 0000 9995`

その他のテストカード: [Stripe公式ドキュメント](https://stripe.com/docs/testing#cards)

### 5.3 Webhookのテスト

Stripe CLIでWebhookイベントを手動でトリガー：

```bash
# チェックアウトセッション完了イベント
stripe trigger checkout.session.completed

# サブスクリプション作成イベント
stripe trigger customer.subscription.created
```

## 6. トラブルシューティング

### 環境変数が読み込まれない

```bash
# .envファイルの確認
cat .env | grep STRIPE

# 環境変数の検証
pnpm verify:stripe
```

### Webhookが届かない

1. Stripe CLIが実行中か確認
2. Next.jsサーバーがポート3000で起動しているか確認
3. Webhook署名シークレットが正しく設定されているか確認

### 型エラー

```bash
# Prisma型の再生成
pnpm db:generate

# TypeScriptの型チェック
pnpm typecheck
```

## 7. セキュリティの注意事項

- **シークレットキーは絶対にコミットしない**
- `.env`ファイルが`.gitignore`に含まれていることを確認
- 本番環境では必ず本番用のAPIキーを使用
- Webhook署名の検証を必ず実装する

## 8. 参考リンク

- [Stripe公式ドキュメント（日本語）](https://stripe.com/docs/ja)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)