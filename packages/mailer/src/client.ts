import type { SentMessageInfo, Transporter } from "nodemailer";
import { render } from "@react-email/render";
import nodemailer from "nodemailer";

import type { MailConfig, MailResult, SendMailOptions } from "./types/index.js";
import { mailConfigSchema } from "./types/index.js";

/**
 * 環境変数からデフォルトのSMTP設定を取得
 *
 * 使用する環境変数:
 * - SMTP_HOST: SMTPサーバーのホスト名（デフォルト: smtp.gmail.com）
 * - SMTP_PORT: SMTPサーバーのポート番号（デフォルト: 587）
 * - SMTP_USER: SMTP認証ユーザー名
 * - SMTP_PASS: SMTP認証パスワード
 * - FROM_EMAIL: 送信元メールアドレス（デフォルト: info@tumiki.cloud）
 */
export const getDefaultMailConfig = (): MailConfig => {
  const port = Number(process.env.SMTP_PORT ?? "587");
  return {
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
    from: process.env.FROM_EMAIL ?? "info@tumiki.cloud",
  };
};

export class MailClient {
  private transporter: Transporter;
  private config: MailConfig;

  constructor(config: MailConfig) {
    const validatedConfig = mailConfigSchema.parse(config);
    this.config = validatedConfig;

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Mail transporter verification failed:", error);
      return false;
    }
  }

  async sendMail(options: SendMailOptions): Promise<MailResult> {
    try {
      let html: string | undefined;
      let text: string | undefined;

      if (options.react) {
        html = await render(options.react);
        text = await render(options.react, { plainText: true });
      } else {
        html = options.html;
        text = options.text;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const info: SentMessageInfo = await this.transporter.sendMail({
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
        messageId: (info as { messageId: string }).messageId,
      };
    } catch (error) {
      console.error("Failed to send email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendBulkMail(emails: SendMailOptions[]): Promise<MailResult[]> {
    const promises = emails.map((email) => this.sendMail(email));
    return Promise.all(promises);
  }

  close(): void {
    this.transporter.close();
  }
}

let globalMailClient: MailClient | null = null;

/**
 * メールクライアントを作成（シングルトン）
 *
 * @param config - SMTP設定（省略時は環境変数から自動読み込み）
 * @returns MailClientインスタンス
 */
export function createMailClient(config?: MailConfig): MailClient {
  if (!globalMailClient) {
    const mailConfig = config ?? getDefaultMailConfig();
    globalMailClient = new MailClient(mailConfig);
  }
  return globalMailClient;
}

export function getMailClient(): MailClient {
  if (!globalMailClient) {
    throw new Error(
      "Mail client is not initialized. Call createMailClient first.",
    );
  }
  return globalMailClient;
}

export function resetMailClient(): void {
  if (globalMailClient) {
    globalMailClient.close();
    globalMailClient = null;
  }
}
