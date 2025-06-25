import { createElement } from "react";

import type { BaseMailOptions, MailResult } from "../types/index.js";
import { getMailClient } from "../client.js";
import { WaitingListConfirmation } from "../emails/WaitingListConfirmation.js";
import { WaitingListConfirmationEN } from "../emails/WaitingListConfirmationEN.js";
import {
  baseMailOptionsSchema,
  waitingListDataSchema,
} from "../types/index.js";

type Language = "ja" | "en";

export async function sendWaitingListConfirmation(
  data: {
    email: string;
    name?: string;
    confirmUrl: string;
    appName?: string;
    language?: Language;
  },
  options: Partial<BaseMailOptions> = {},
): Promise<MailResult> {
  const validatedData = waitingListDataSchema.parse(data);
  const validatedOptions = baseMailOptionsSchema.parse({
    ...options,
    to: validatedData.email,
  });

  const client = getMailClient();

  // 言語に応じてテンプレートとメッセージを選択
  const language = data.language || "ja";
  const isJapanese = language === "ja";

  const subject = isJapanese
    ? `${validatedData.appName} - 早期アクセス登録完了`
    : `${validatedData.appName} - Early Access Registration Complete`;

  const EmailComponent = isJapanese
    ? WaitingListConfirmation
    : WaitingListConfirmationEN;

  const emailComponent = createElement(EmailComponent, {
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
