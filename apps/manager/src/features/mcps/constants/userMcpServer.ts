import { ServerStatus, AuthType } from "@tumiki/db/prisma";

export const SERVER_STATUS_LABELS = {
  [ServerStatus.RUNNING]: "接続可能",
  [ServerStatus.STOPPED]: "接続不可",
  [ServerStatus.ERROR]: "エラー",
  [ServerStatus.PENDING]: "検証中",
} as const;

export const AUTH_TYPE_LABELS = {
  [AuthType.NONE]: "なし",
  [AuthType.API_KEY]: "APIキー",
  [AuthType.OAUTH]: "OAuth",
} as const;
