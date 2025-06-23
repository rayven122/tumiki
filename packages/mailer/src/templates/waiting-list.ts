import { createElement } from "react";

import type { BaseMailOptions, MailResult } from "../types/index.js";
import { getMailClient } from "../client.js";
import { WaitingListConfirmation } from "../emails/WaitingListConfirmation.js";
import {
  baseMailOptionsSchema,
  waitingListDataSchema,
} from "../types/index.js";

export async function sendWaitingListConfirmation(
  data: { email: string; name?: string; confirmUrl: string; appName?: string },
  options: Partial<BaseMailOptions> = {},
): Promise<MailResult> {
  const validatedData = waitingListDataSchema.parse(data);
  const validatedOptions = baseMailOptionsSchema.parse({
    ...options,
    to: validatedData.email,
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
