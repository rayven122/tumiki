import { z } from "zod";

export const mailConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean().optional().default(false),
  auth: z.object({
    user: z.string(),
    pass: z.string(),
  }),
  from: z.string().email(),
  fromName: z.string().optional(),
});

export type MailConfig = z.infer<typeof mailConfigSchema>;

export const emailAddressSchema = z.string().email();

export const baseMailOptionsSchema = z.object({
  to: z.union([emailAddressSchema, z.array(emailAddressSchema)]),
  cc: z.union([emailAddressSchema, z.array(emailAddressSchema)]).optional(),
  bcc: z.union([emailAddressSchema, z.array(emailAddressSchema)]).optional(),
  replyTo: emailAddressSchema.optional(),
});

export type BaseMailOptions = z.infer<typeof baseMailOptionsSchema>;

export const waitingListDataSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  confirmUrl: z.string().url(),
  appName: z.string().default("Tumiki"),
  language: z.enum(["ja", "en"]).optional().default("ja"),
});

export type WaitingListData = z.infer<typeof waitingListDataSchema>;

export const invitationDataSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  inviteUrl: z.string().url(),
  appName: z.string().default("Tumiki"),
  expiresAt: z.string().optional(),
});

export type InvitationData = z.infer<typeof invitationDataSchema>;

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

export interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendMailOptions extends BaseMailOptions {
  subject: string;
  html?: string;
  text?: string;
  react?: React.ReactElement;
}
