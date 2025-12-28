export {
  MailClient,
  createMailClient,
  getMailClient,
  resetMailClient,
  getDefaultMailConfig,
} from "./client.js";

export * from "./templates/index.js";

export type {
  MailConfig,
  MailResult,
  BaseMailOptions,
  SendMailOptions,
  WaitingListData,
  InvitationData,
  NotificationData,
} from "./types/index.js";

export {
  mailConfigSchema,
  baseMailOptionsSchema,
  waitingListDataSchema,
  invitationDataSchema,
  notificationDataSchema,
} from "./types/index.js";

export * from "./utils/validate.js";
export * from "./utils/formatter.js";
