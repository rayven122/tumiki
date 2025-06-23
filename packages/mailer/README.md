# @tumiki/mailer

Tumiki モノレポ用のメール送信パッケージです。React Email を使用して型安全で美しいメールテンプレートを提供し、nodemailer を通じて送信機能を実装します。

## 特徴

- 🎨 **React Email** - コンポーネントベースの美しいメールテンプレート
- 🔒 **型安全** - TypeScript + Zod によるランタイムバリデーション
- 📧 **事前定義テンプレート** - Waiting List、招待、通知メール
- 🔧 **カスタマイズ可能** - 独自のメールテンプレートも簡単に作成
- ⚡ **開発体験** - React Email 開発サーバーでリアルタイムプレビュー

## インストール

```bash
pnpm install @tumiki/mailer
```

## 使用方法

### 基本セットアップ

```typescript
import { createMailClient } from "@tumiki/mailer";

// メールクライアントの初期化
const mailClient = createMailClient({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "noreply@example.com",
    pass: "your-app-password",
  },
  from: "Tumiki <noreply@example.com>",
});
```

### Waiting List 確認メール

```typescript
import { sendWaitingListConfirmation } from "@tumiki/mailer";

const result = await sendWaitingListConfirmation({
  email: "user@example.com",
  name: "田中太郎",
  confirmUrl: "https://example.com/confirm?token=abc123",
  appName: "Tumiki",
});

if (result.success) {
  console.log("メール送信成功:", result.messageId);
} else {
  console.error("メール送信失敗:", result.error);
}
```

### 招待メール

```typescript
import { sendInvitation } from "@tumiki/mailer";

await sendInvitation({
  email: "user@example.com",
  name: "田中太郎",
  inviteUrl: "https://example.com/invite?token=xyz789",
  appName: "Tumiki",
  expiresAt: "2024-12-31 23:59:59",
});
```

### 通知メール

```typescript
import { sendNotification } from "@tumiki/mailer";

await sendNotification({
  email: "user@example.com",
  name: "田中太郎",
  title: "重要なお知らせ",
  message: "<p>システムメンテナンスのお知らせです。</p>",
  actionUrl: "https://example.com/maintenance",
  actionText: "詳細を確認",
  appName: "Tumiki",
});
```

### カスタムメールテンプレート

```typescript
import { createElement } from "react";
import { getMailClient, Layout, Header, Button } from "@tumiki/mailer";
import { Section, Text } from "@react-email/components";

function CustomEmail({ userName }: { userName: string }) {
  return (
    <Layout appName="Tumiki" previewText="カスタムメール">
      <Header
        title="Welcome!"
        subtitle="カスタムメールテンプレート"
        gradient="green"
      />
      <Section style={{ padding: "20px" }}>
        <Text>{userName}様、</Text>
        <Text>カスタムメールの例です。</Text>
        <Button href="https://example.com">
          ボタンをクリック
        </Button>
      </Section>
    </Layout>
  );
}

const client = getMailClient();
await client.sendMail({
  to: "user@example.com",
  subject: "カスタムメール",
  react: createElement(CustomEmail, { userName: "田中太郎" }),
});
```

## 開発

### React Email 開発サーバー

メールテンプレートをプレビューするには：

```bash
cd packages/mailer
pnpm email:dev
```

ブラウザで `http://localhost:3001` を開くと、すべてのメールテンプレートをプレビューできます。

### 開発コマンド

```bash
# 開発モード（ウォッチモード）
pnpm dev

# ビルド
pnpm build

# 型チェック
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix

# フォーマット
pnpm format
pnpm format:fix

# クリーンアップ
pnpm clean
```

## API リファレンス

### メールクライアント

#### `createMailClient(config: MailConfig): MailClient`

メールクライアントを作成します。

#### `getMailClient(): MailClient`

既存のメールクライアントを取得します。

#### `resetMailClient(): void`

メールクライアントをリセットします。

### テンプレート関数

#### `sendWaitingListConfirmation(data: WaitingListData, options?: BaseMailOptions): Promise<MailResult>`

Waiting List 確認メールを送信します。

#### `sendInvitation(data: InvitationData, options?: BaseMailOptions): Promise<MailResult>`

招待メールを送信します。

#### `sendNotification(data: NotificationData, options?: BaseMailOptions): Promise<MailResult>`

通知メールを送信します。

### 型定義

```typescript
interface MailConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WaitingListData {
  email: string;
  name?: string;
  confirmUrl: string;
  appName?: string;
}

interface InvitationData {
  email: string;
  name?: string;
  inviteUrl: string;
  appName?: string;
  expiresAt?: string;
}

interface NotificationData {
  email: string;
  name?: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  appName?: string;
}
```
