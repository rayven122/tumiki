import { format } from "date-fns";

/** 開始時刻をフォーマット（絶対時刻） */
export const formatStartTime = (createdAt: Date): string =>
  format(createdAt, "HH:mm:ss");

/** 経過時間をフォーマット（mm:ss形式） */
export const formatElapsedTime = (createdAt: Date): string => {
  const elapsedMs = Date.now() - createdAt.getTime();
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};
