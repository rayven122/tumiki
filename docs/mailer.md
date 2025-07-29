# @tumiki/mailer Package Design

## 概要

`@tumiki/mailer` は、Tumiki モノレポ用のメール送信パッケージです。React Email を使用して型安全で美しいメールテンプレートを提供し、nodemailer を通じて送信機能を実装します。

## パッケージ構造

```
packages/mailer/
├── src/
│   ├── index.ts              # メインエクスポート
│   ├── client.ts             # メールクライアント実装
│   ├── emails/               # React Email コンポーネント
│   │   ├── index.ts
│   │   ├── WaitingListConfirmation.tsx
│   │   ├── Invitation.tsx
│   │   ├── Notification.tsx
│   │   └── components/       # 共通コンポーネント
│   │       ├── Layout.tsx
│   │       ├── Button.tsx
│   │       └── Header.tsx
│   ├── templates/            # テンプレートラッパー関数
│   │   ├── index.ts
│   │   ├── waiting-list.ts
│   │   ├── invitation.ts
│   │   └── notification.ts
│   ├── types/                # 型定義
│   │   └── index.ts
│   └── utils/                # ユーティリティ
│       ├── validate.ts
│       └── formatter.ts
├── package.json
├── tsconfig.json
├── eslint.config.js
└── README.md
```

## package.json

```json
{
  "name": "@tumiki/mailer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/src/index.d.ts",
      "default": "./dist/src/index.js"
    },
    "./emails": {
      "types": "./dist/src/emails/index.d.ts",
      "default": "./dist/src/emails/index.js"
    },
    "./templates": {
      "types": "./dist/src/templates/index.d.ts",
      "default": "./dist/src/templates/index.js"
    }
  },
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc",
    "clean": "git clean -xdf .cache .turbo dist node_modules",
    "typecheck": "tsc --noEmit",
    "lint": "eslint",
    "lint:fix": "eslint --fix",
    "format": "prettier --check . --ignore-path ../../.gitignore",
    "format:fix": "prettier --write . --ignore-path ../../.gitignore",
    "email:dev": "email dev"
  },
  "dependencies": {
    "nodemailer": "^6.9.8",
    "zod": "catalog:",
    "@react-email/components": "^0.0.31",
    "@react-email/render": "^1.1.1",
    "react": "catalog:react19",
    "react-dom": "catalog:react19"
  },
  "devDependencies": {
    "@tumiki/eslint-config": "workspace:*",
    "@tumiki/prettier-config": "workspace:*",
    "@tumiki/tsconfig": "workspace:*",
    "@types/nodemailer": "^6.4.14",
    "@types/react": "catalog:react19",
    "@types/react-dom": "catalog:react19",
    "@types/node": "^22.15.3",
    "eslint": "catalog:",
    "prettier": "catalog:",
    "typescript": "catalog:",
    "typescript-eslint": "^8.33.0",
    "react-email": "^3.0.3",
    "vitest": "catalog:"
  },
  "prettier": "@tumiki/prettier-config"
}
```

## tsconfig.json

```json
{
  "extends": "@tumiki/tsconfig/base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist/src",
    "declaration": true,
    "declarationDir": "dist/src",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "target": "ES2022",
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": false,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

## eslint.config.js

```javascript
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["build/**", "dist/**", "node_modules/**", ".react-email/**"],
  },
  {
    files: ["**/*.js"],
    extends: [...tseslint.configs.recommended],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
);
```

## 型定義 (src/types/index.ts)

```typescript
import { z } from "zod";

// メール設定スキーマ
export const mailConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean().optional().default(false),
  auth: z.object({
    user: z.string(),
    pass: z.string(),
  }),
  from: z.string().email(),
});

export type MailConfig = z.infer<typeof mailConfigSchema>;

// メールアドレススキーマ
export const emailAddressSchema = z.string().email();

// 基本メールオプションスキーマ
export const baseMailOptionsSchema = z.object({
  to: z.union([emailAddressSchema, z.array(emailAddressSchema)]),
  cc: z.union([emailAddressSchema, z.array(emailAddressSchema)]).optional(),
  bcc: z.union([emailAddressSchema, z.array(emailAddressSchema)]).optional(),
  replyTo: emailAddressSchema.optional(),
});

export type BaseMailOptions = z.infer<typeof baseMailOptionsSchema>;

// Waiting List データスキーマ
export const waitingListDataSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  confirmUrl: z.string().url(),
  appName: z.string().default("Tumiki"),
});

export type WaitingListData = z.infer<typeof waitingListDataSchema>;

// 招待データスキーマ
export const invitationDataSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  inviteUrl: z.string().url(),
  appName: z.string().default("Tumiki"),
  expiresAt: z.string().optional(),
});

export type InvitationData = z.infer<typeof invitationDataSchema>;

// 通知データスキーマ
export const notificationDataSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  title: z.string(),
  message: z.string(),
  actionUrl: z.string().url().optional(),
  actionText: z.string().optional(),
  appName: z.string().default("Tumiki"),
});

export type NotificationData = z.infer<typeof notificationDataSchema>;

// メール送信結果
export interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// メール送信オプション
export interface SendMailOptions extends BaseMailOptions {
  subject: string;
  html?: string;
  text?: string;
  react?: React.ReactElement;
}
```

## メールクライアント (src/client.ts)

```typescript
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { render } from "@react-email/render";
import type { MailConfig, MailResult, SendMailOptions } from "./types/index.js";
import { mailConfigSchema } from "./types/index.js";

export class MailClient {
  private transporter: Transporter;
  private config: MailConfig;

  constructor(config: MailConfig) {
    // 設定をバリデーション
    const validatedConfig = mailConfigSchema.parse(config);
    this.config = validatedConfig;

    // トランスポーター作成
    this.transporter = nodemailer.createTransporter({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });
  }

  /**
   * 接続確認
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Mail transporter verification failed:", error);
      return false;
    }
  }

  /**
   * メール送信
   */
  async sendMail(options: SendMailOptions): Promise<MailResult> {
    try {
      let html: string | undefined;
      let text: string | undefined;

      // React Email コンポーネントがある場合は変換
      if (options.react) {
        html = await render(options.react);
        text = await render(options.react, { plainText: true });
      } else {
        html = options.html;
        text = options.text;
      }

      const info = await this.transporter.sendMail({
        from: this.config.from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        subject: options.subject,
        html,
        text,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("Failed to send email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 複数メールの並列送信
   */
  async sendBulkMail(
    emails: SendMailOptions[]
  ): Promise<MailResult[]> {
    const promises = emails.map((email) => this.sendMail(email));
    return Promise.all(promises);
  }

  /**
   * リソースのクリーンアップ
   */
  close(): void {
    this.transporter.close();
  }
}

// グローバルクライアント管理
let globalMailClient: MailClient | null = null;

/**
 * メールクライアントの作成
 */
export function createMailClient(config: MailConfig): MailClient {
  if (!globalMailClient) {
    globalMailClient = new MailClient(config);
  }
  return globalMailClient;
}

/**
 * 既存のメールクライアントを取得
 */
export function getMailClient(): MailClient {
  if (!globalMailClient) {
    throw new Error("Mail client is not initialized. Call createMailClient first.");
  }
  return globalMailClient;
}

/**
 * メールクライアントをリセット
 */
export function resetMailClient(): void {
  if (globalMailClient) {
    globalMailClient.close();
    globalMailClient = null;
  }
}
```

## 共通コンポーネント

### レイアウト (src/emails/components/Layout.tsx)

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Preview,
} from "@react-email/components";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  appName?: string;
  previewText?: string;
}

export function Layout({ 
  children, 
  appName = "Tumiki", 
  previewText 
}: LayoutProps) {
  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={main}>
        <Container style={container}>
          {children}
          <Section style={footer}>
            <Text style={footerText}>
              このメールは自動送信されています。
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} {appName}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  lineHeight: 1.6,
  color: "#333333",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};

const footer = {
  textAlign: "center" as const,
  marginTop: "32px",
  paddingTop: "24px",
  borderTop: "1px solid #e6ebf1",
};

const footerText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "4px 0",
};
```

### ヘッダー (src/emails/components/Header.tsx)

```tsx
import { Section, Text } from "@react-email/components";

interface HeaderProps {
  title: string;
  subtitle?: string;
  gradient?: "blue" | "green" | "purple";
}

export function Header({ 
  title, 
  subtitle, 
  gradient = "blue" 
}: HeaderProps) {
  return (
    <Section style={{ ...header, ...gradients[gradient] }}>
      <Text style={headerTitle}>{title}</Text>
      {subtitle && <Text style={headerSubtitle}>{subtitle}</Text>}
    </Section>
  );
}

const header = {
  padding: "40px 30px",
  borderRadius: "12px 12px 0 0",
  textAlign: "center" as const,
  marginBottom: "30px",
  color: "#ffffff",
};

const gradients = {
  blue: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  green: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
  purple: {
    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  },
};

const headerTitle = {
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 8px 0",
  color: "#ffffff",
};

const headerSubtitle = {
  fontSize: "18px",
  margin: "0",
  opacity: 0.9,
  color: "#ffffff",
};
```

### ボタン (src/emails/components/Button.tsx)

```tsx
import { Button as ReactEmailButton } from "@react-email/components";
import type { ReactNode } from "react";

interface ButtonProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "success";
}

export function Button({ 
  href, 
  children, 
  variant = "primary" 
}: ButtonProps) {
  return (
    <ReactEmailButton 
      href={href} 
      style={{ ...buttonBase, ...variants[variant] }}
    >
      {children}
    </ReactEmailButton>
  );
}

const buttonBase = {
  display: "inline-block",
  padding: "15px 30px",
  textDecoration: "none",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "16px",
  textAlign: "center" as const,
  cursor: "pointer",
  border: "none",
  margin: "20px 0",
};

const variants = {
  primary: {
    backgroundColor: "#4f46e5",
    color: "#ffffff",
  },
  secondary: {
    backgroundColor: "#6b7280",
    color: "#ffffff",
  },
  success: {
    backgroundColor: "#10b981",
    color: "#ffffff",
  },
};
```

## メールテンプレート

### Waiting List確認 (src/emails/WaitingListConfirmation.tsx)

```tsx
import { Section, Text } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Header } from "./components/Header.js";
import { Button } from "./components/Button.js";

interface WaitingListConfirmationProps {
  name?: string;
  confirmUrl: string;
  appName?: string;
}

export function WaitingListConfirmation({
  name,
  confirmUrl,
  appName = "Tumiki",
}: WaitingListConfirmationProps) {
  const previewText = `${appName} - Waiting List登録確認`;

  return (
    <Layout appName={appName} previewText={previewText}>
      <Header
        title={appName}
        subtitle="Waiting List登録ありがとうございます"
        gradient="blue"
      />

      <Section style={content}>
        <Text style={heading}>登録確認のお願い</Text>
        {name && <Text style={greeting}>{name} 様</Text>}
        <Text style={paragraph}>
          {appName}のWaiting Listにご登録いただき、ありがとうございます。
        </Text>
        <Text style={paragraph}>
          以下のボタンをクリックして、登録を完了してください：
        </Text>
        <Section style={buttonContainer}>
          <Button href={confirmUrl} variant="primary">
            登録を確認する
          </Button>
        </Section>
        <Text style={note}>
          このリンクの有効期限は24時間です。
        </Text>
      </Section>
    </Layout>
  );
}

// スタイル定義
const content = {
  backgroundColor: "#f8fafc",
  padding: "30px",
  borderRadius: "8px",
  marginBottom: "30px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
  color: "#1f2937",
};

const greeting = {
  fontSize: "18px",
  margin: "0 0 16px 0",
  color: "#374151",
};

const paragraph = {
  fontSize: "16px",
  margin: "0 0 16px 0",
  color: "#374151",
  lineHeight: "1.6",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const note = {
  fontSize: "14px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "16px 0 0 0",
};

// デフォルトエクスポート（React Email開発サーバー用）
export default WaitingListConfirmation;
```

### 招待メール (src/emails/Invitation.tsx)

```tsx
import { Section, Text } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Header } from "./components/Header.js";
import { Button } from "./components/Button.js";

interface InvitationProps {
  name?: string;
  inviteUrl: string;
  appName?: string;
  expiresAt?: string;
}

export function Invitation({
  name,
  inviteUrl,
  appName = "Tumiki",
  expiresAt,
}: InvitationProps) {
  const previewText = `🎉 ${appName}へのご招待`;

  return (
    <Layout appName={appName} previewText={previewText}>
      <Header
        title="🎉 おめでとうございます！"
        subtitle={`${appName}をご利用いただけるようになりました`}
        gradient="green"
      />

      <Section style={content}>
        <Text style={heading}>サービス開始のご案内</Text>
        {name && <Text style={greeting}>{name} 様</Text>}
        <Text style={paragraph}>
          お待たせいたしました！{appName}のサービスをご利用いただけるようになりました。
        </Text>
        <Text style={paragraph}>
          以下のボタンをクリックして、今すぐ始めましょう：
        </Text>
        <Section style={buttonContainer}>
          <Button href={inviteUrl} variant="success">
            今すぐ始める
          </Button>
        </Section>
        {expiresAt && (
          <Text style={note}>
            この招待の有効期限: {expiresAt}
          </Text>
        )}
        <Text style={support}>
          ご質問がございましたら、お気軽にお問い合わせください。
        </Text>
      </Section>
    </Layout>
  );
}

// スタイル定義
const content = {
  backgroundColor: "#f0fdf4",
  padding: "30px",
  borderRadius: "8px",
  marginBottom: "30px",
  borderLeft: "4px solid #10b981",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
  color: "#1f2937",
};

const greeting = {
  fontSize: "18px",
  margin: "0 0 16px 0",
  color: "#374151",
};

const paragraph = {
  fontSize: "16px",
  margin: "0 0 16px 0",
  color: "#374151",
  lineHeight: "1.6",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const note = {
  fontSize: "14px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "16px 0",
};

const support = {
  fontSize: "14px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "24px 0 0 0",
};

// デフォルトエクスポート
export default Invitation;
```

### 通知メール (src/emails/Notification.tsx)

```tsx
import { Section, Text } from "@react-email/components";
import { Layout } from "./components/Layout.js";
import { Header } from "./components/Header.js";
import { Button } from "./components/Button.js";

interface NotificationProps {
  title: string;
  name?: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  appName?: string;
}

export function Notification({
  title,
  name,
  message,
  actionUrl,
  actionText,
  appName = "Tumiki",
}: NotificationProps) {
  return (
    <Layout appName={appName} previewText={title}>
      <Header title={title} gradient="purple" />

      <Section style={content}>
        {name && <Text style={greeting}>{name} 様</Text>}
        <div dangerouslySetInnerHTML={{ __html: message }} style={paragraph} />
        {actionUrl && actionText && (
          <Section style={buttonContainer}>
            <Button href={actionUrl} variant="primary">
              {actionText}
            </Button>
          </Section>
        )}
      </Section>
    </Layout>
  );
}

// スタイル定義
const content = {
  backgroundColor: "#ffffff",
  padding: "30px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  marginBottom: "30px",
};

const greeting = {
  fontSize: "18px",
  margin: "0 0 16px 0",
  color: "#374151",
};

const paragraph = {
  fontSize: "16px",
  margin: "0 0 16px 0",
  color: "#374151",
  lineHeight: "1.6",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

// デフォルトエクスポート
export default Notification;
```

## テンプレート関数

### Waiting List (src/templates/waiting-list.ts)

```typescript
import { createElement } from "react";
import type { WaitingListData, BaseMailOptions, MailResult } from "../types/index.js";
import { waitingListDataSchema, baseMailOptionsSchema } from "../types/index.js";
import { WaitingListConfirmation } from "../emails/WaitingListConfirmation.js";
import { getMailClient } from "../client.js";

export async function sendWaitingListConfirmation(
  data: WaitingListData,
  options: BaseMailOptions = {}
): Promise<MailResult> {
  // データバリデーション
  const validatedData = waitingListDataSchema.parse(data);
  const validatedOptions = baseMailOptionsSchema.parse({
    to: validatedData.email,
    ...options,
  });

  const client = getMailClient();

  const subject = `${validatedData.appName} - Waiting List登録確認`;

  const emailComponent = createElement(WaitingListConfirmation, {
    name: validatedData.name,
    confirmUrl: validatedData.confirmUrl,
    appName: validatedData.appName,
  });

  return client.sendMail({
    to: validatedOptions.to,
    cc: validatedOptions.cc,
    bcc: validatedOptions.bcc,
    replyTo: validatedOptions.replyTo,
    subject,
    react: emailComponent,
  });
}
```

### 招待 (src/templates/invitation.ts)

```typescript
import { createElement } from "react";
import type { InvitationData, BaseMailOptions, MailResult } from "../types/index.js";
import { invitationDataSchema, baseMailOptionsSchema } from "../types/index.js";
import { Invitation } from "../emails/Invitation.js";
import { getMailClient } from "../client.js";

export async function sendInvitation(
  data: InvitationData,
  options: BaseMailOptions = {}
): Promise<MailResult> {
  // データバリデーション
  const validatedData = invitationDataSchema.parse(data);
  const validatedOptions = baseMailOptionsSchema.parse({
    to: validatedData.email,
    ...options,
  });

  const client = getMailClient();

  const subject = `🎉 ${validatedData.appName}へのご招待`;

  const emailComponent = createElement(Invitation, {
    name: validatedData.name,
    inviteUrl: validatedData.inviteUrl,
    appName: validatedData.appName,
    expiresAt: validatedData.expiresAt,
  });

  return client.sendMail({
    to: validatedOptions.to,
    cc: validatedOptions.cc,
    bcc: validatedOptions.bcc,
    replyTo: validatedOptions.replyTo,
    subject,
    react: emailComponent,
  });
}
```

### 通知 (src/templates/notification.ts)

```typescript
import { createElement } from "react";
import type { NotificationData, BaseMailOptions, MailResult } from "../types/index.js";
import { notificationDataSchema, baseMailOptionsSchema } from "../types/index.js";
import { Notification } from "../emails/Notification.js";
import { getMailClient } from "../client.js";

export async function sendNotification(
  data: NotificationData,
  options: BaseMailOptions = {}
): Promise<MailResult> {
  // データバリデーション
  const validatedData = notificationDataSchema.parse(data);
  const validatedOptions = baseMailOptionsSchema.parse({
    to: validatedData.email,
    ...options,
  });

  const client = getMailClient();

  const subject = validatedData.title;

  const emailComponent = createElement(Notification, {
    title: validatedData.title,
    name: validatedData.name,
    message: validatedData.message,
    actionUrl: validatedData.actionUrl,
    actionText: validatedData.actionText,
    appName: validatedData.appName,
  });

  return client.sendMail({
    to: validatedOptions.to,
    cc: validatedOptions.cc,
    bcc: validatedOptions.bcc,
    replyTo: validatedOptions.replyTo,
    subject,
    react: emailComponent,
  });
}
```

## ユーティリティ

### バリデーション (src/utils/validate.ts)

```typescript
import { z } from "zod";

/**
 * メールアドレスのバリデーション
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 複数のメールアドレスをバリデーション
 */
export function validateEmails(emails: string[]): boolean {
  return emails.every(validateEmail);
}

/**
 * メールアドレスリストの正規化
 */
export function normalizeEmailList(
  emails: string | string[] | undefined
): string[] | undefined {
  if (!emails) return undefined;
  if (typeof emails === "string") return [emails];
  return emails;
}
```

### フォーマッター (src/utils/formatter.ts)

```typescript
/**
 * 日付を日本語フォーマットに変換
 */
export function formatDateJa(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * HTMLエスケープ
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

/**
 * プレーンテキストに変換
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
```

## エクスポート

### メールコンポーネント (src/emails/index.ts)

```typescript
export { WaitingListConfirmation } from "./WaitingListConfirmation.js";
export { Invitation } from "./Invitation.js";
export { Notification } from "./Notification.js";
export { Layout } from "./components/Layout.js";
export { Header } from "./components/Header.js";
export { Button } from "./components/Button.js";
```

### テンプレート (src/templates/index.ts)

```typescript
export { sendWaitingListConfirmation } from "./waiting-list.js";
export { sendInvitation } from "./invitation.js";
export { sendNotification } from "./notification.js";
```

### メインエクスポート (src/index.ts)

```typescript
// Client
export {
  MailClient,
  createMailClient,
  getMailClient,
  resetMailClient,
} from "./client.js";

// Templates
export * from "./templates/index.js";

// Types
export type {
  MailConfig,
  MailResult,
  BaseMailOptions,
  SendMailOptions,
  WaitingListData,
  InvitationData,
  NotificationData,
} from "./types/index.js";

// Schemas
export {
  mailConfigSchema,
  baseMailOptionsSchema,
  waitingListDataSchema,
  invitationDataSchema,
  notificationDataSchema,
} from "./types/index.js";

// Utils
export * from "./utils/validate.js";
export * from "./utils/formatter.js";
```

## 使用例

### 環境変数設定

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=noreply@example.com
MAIL_PASS=your-app-password
MAIL_FROM="Tumiki <noreply@example.com>"
```

### 初期化 (apps/manager/src/lib/mail.ts)

```typescript
import { createMailClient } from "@tumiki/mailer";

// メールクライアントの初期化
export const initializeMailer = () => {
  return createMailClient({
    host: process.env.MAIL_HOST!,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: {
      user: process.env.MAIL_USER!,
      pass: process.env.MAIL_PASS!,
    },
    from: process.env.MAIL_FROM!,
  });
};
```

### API Route での使用 (apps/manager/src/app/api/waiting-list/route.ts)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sendWaitingListConfirmation } from "@tumiki/mailer";
import { db } from "@tumiki/db";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    // トークン生成
    const token = randomBytes(32).toString("hex");

    // データベースに保存
    await db.waitingList.create({
      data: {
        email,
        name,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
      },
    });

    // 確認メール送信
    const result = await sendWaitingListConfirmation({
      email,
      name,
      confirmUrl: `${process.env.NEXT_PUBLIC_APP_URL}/confirm?token=${token}`,
      appName: "Tumiki",
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to add to waiting list:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
```

### カスタムメールの作成

```typescript
import { createElement } from "react";
import { getMailClient, Layout, Header, Button } from "@tumiki/mailer";
import { Section, Text } from "@react-email/components";

// カスタムメールコンポーネント
function CustomWelcomeEmail({ userName }: { userName: string }) {
  return (
    <Layout appName="Tumiki" previewText="Tumikiへようこそ！">
      <Header 
        title="Welcome to Tumiki!" 
        subtitle="アカウント作成ありがとうございます"
        gradient="green" 
      />
      <Section style={{ padding: "20px" }}>
        <Text>{userName}様、</Text>
        <Text>
          Tumikiへのご登録ありがとうございます。
          これから素晴らしい体験をお届けします。
        </Text>
        <Button href="https://tumiki.app/dashboard">
          ダッシュボードへ
        </Button>
      </Section>
    </Layout>
  );
}

// 送信
const client = getMailClient();
await client.sendMail({
  to: "user@example.com",
  subject: "Tumikiへようこそ！",
  react: createElement(CustomWelcomeEmail, { userName: "田中太郎" }),
});
```

### tRPC での使用例

```typescript
// apps/manager/src/server/api/routers/mail.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sendNotification } from "@tumiki/mailer";

export const mailRouter = createTRPCRouter({
  sendNotification: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        message: z.string(),
        actionUrl: z.string().url().optional(),
        actionText: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      
      const result = await sendNotification({
        email: user.email!,
        name: user.name || undefined,
        title: input.title,
        message: input.message,
        actionUrl: input.actionUrl,
        actionText: input.actionText,
      });

      if (!result.success) {
        throw new Error("Failed to send notification");
      }

      return { success: true };
    }),
});
```

## 開発コマンド

```bash
# パッケージディレクトリに移動
cd packages/mailer

# 依存関係インストール
pnpm install

# React Email開発サーバー起動
pnpm email:dev

# ビルド
pnpm build

# 開発モード（ウォッチモード）
pnpm dev

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

## テスト環境での確認

React Email の開発サーバーを使用してメールテンプレートをプレビュー：

```bash
pnpm email:dev
```

ブラウザで `http://localhost:3001` を開くと、すべてのメールテンプレートをプレビューできます。

## まとめ

このパッケージは、Tumikiモノレポの既存パターンに従い、以下の特徴を持っています：

1. **型安全性**: Zodスキーマによるランタイムバリデーション
2. **ESMモジュール**: モダンなJavaScriptモジュール形式
3. **React Email**: コンポーネントベースのメール作成
4. **統一された設定**: モノレポ全体で共有される設定を使用
5. **開発体験**: ホットリロード対応の開発サーバー

既存のパッケージと同じ構造とパターンを採用することで、一貫性のあるコードベースを維持できます。