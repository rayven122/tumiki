import { createElement } from "react";

import type { BaseMailOptions, MailResult } from "../types/index.js";
import { getMailClient } from "../client.js";
import { Notification } from "../emails/Notification.js";
import {
  baseMailOptionsSchema,
  notificationDataSchema,
} from "../types/index.js";

export async function sendNotification(
  data: {
    email: string;
    name?: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    appName?: string;
  },
  options: Partial<BaseMailOptions> = {},
): Promise<MailResult> {
  const validatedData = notificationDataSchema.parse(data);
  const validatedOptions = baseMailOptionsSchema.parse({
    ...options,
    to: validatedData.email,
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
