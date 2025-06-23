import type { SentMessageInfo, Transporter } from "nodemailer";
import { render } from "@react-email/render";
import nodemailer from "nodemailer";

import type { MailConfig, MailResult, SendMailOptions } from "./types/index.js";
import { mailConfigSchema } from "./types/index.js";

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        messageId: info.messageId as string,
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

export function createMailClient(config: MailConfig): MailClient {
  if (!globalMailClient) {
    globalMailClient = new MailClient(config);
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
