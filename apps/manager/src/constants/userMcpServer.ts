import { ServerStatus } from "@tumiki/db/prisma";

export const SERVER_STATUS_LABELS = {
  [ServerStatus.RUNNING]: "実行中",
  [ServerStatus.STOPPED]: "停止中",
  [ServerStatus.ERROR]: "エラー",
  [ServerStatus.PENDING]: "検証中",
} as const;
