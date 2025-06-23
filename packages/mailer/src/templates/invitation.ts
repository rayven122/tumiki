import { createElement } from "react";

import type { BaseMailOptions, MailResult } from "../types/index.js";
import { getMailClient } from "../client.js";
import { Invitation } from "../emails/Invitation.js";
import { baseMailOptionsSchema, invitationDataSchema } from "../types/index.js";

export async function sendInvitation(
  data: {
    email: string;
    name?: string;
    inviteUrl: string;
    appName?: string;
    expiresAt?: string;
  },
  options: Partial<BaseMailOptions> = {},
): Promise<MailResult> {
  const validatedData = invitationDataSchema.parse(data);
  const validatedOptions = baseMailOptionsSchema.parse({
    ...options,
    to: validatedData.email,
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
