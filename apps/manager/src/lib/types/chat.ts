/**
 * チャット関連の共通型定義
 */

import type { Chat } from "@tumiki/db/prisma";

/**
 * ユーザー情報を含むチャット型
 * 組織内共有チャットにはユーザー情報も含まれる
 *
 * 注: Chat 型には既に visibility: McpServerVisibility が含まれているため、
 * 重複して定義する必要はありません
 */
export type ChatWithUser = Chat & {
  user: {
    id: string;
    name: string | null;
  };
};

/**
 * チャット履歴のページネーション結果
 */
export type ChatHistory = {
  chats: ChatWithUser[];
  hasMore: boolean;
};

/**
 * 日付でグループ化されたチャット
 */
export type GroupedChats = {
  today: ChatWithUser[];
  yesterday: ChatWithUser[];
  lastWeek: ChatWithUser[];
  lastMonth: ChatWithUser[];
  older: ChatWithUser[];
};
