import { ServerStatus } from "@tumiki/db/prisma";

export const SERVER_STATUS_LABELS = {
  [ServerStatus.RUNNING]: "実行中",
  [ServerStatus.STOPPED]: "停止中",
  [ServerStatus.ERROR]: "エラー",
} as const;
