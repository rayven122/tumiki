/**
 * チャットアクセス権限チェック関連のユーティリティ
 */

import type { McpServerVisibility } from "@tumiki/db/prisma";

/**
 * チャットアクセス権限のチェック結果
 */
type ChatAccessResult = {
  /** アクセス許可されているか */
  canAccess: boolean;
  /** 所有者かどうか */
  isOwner: boolean;
  /** 組織内共有チャットかどうか */
  isOrganizationShared: boolean;
};

/**
 * チャットアクセス権限のチェックパラメータ
 */
type CheckChatAccessParams = {
  /** チャットの所有者ID */
  chatUserId: string;
  /** チャットの可視性 */
  chatVisibility: McpServerVisibility;
  /** チャットの組織ID */
  chatOrganizationId: string;
  /** 現在のユーザーID */
  currentUserId: string;
  /** 現在のコンテキストの組織ID */
  currentOrganizationId: string;
};

/**
 * チャットへのアクセス権限をチェックする
 *
 * アクセス条件:
 * - PRIVATE: 所有者のみ
 * - ORGANIZATION: 所有者 または 同じ組織のメンバー
 * - PUBLIC: 全員
 */
export const checkChatAccess = ({
  chatUserId,
  chatVisibility,
  chatOrganizationId,
  currentUserId,
  currentOrganizationId,
}: CheckChatAccessParams): ChatAccessResult => {
  const isOwner = chatUserId === currentUserId;
  const isOrganizationShared =
    chatVisibility === "ORGANIZATION" &&
    chatOrganizationId === currentOrganizationId;

  let canAccess = false;

  switch (chatVisibility) {
    case "PRIVATE":
      canAccess = isOwner;
      break;
    case "ORGANIZATION":
      canAccess = isOwner || isOrganizationShared;
      break;
    case "PUBLIC":
      canAccess = true;
      break;
  }

  return {
    canAccess,
    isOwner,
    isOrganizationShared,
  };
};

/**
 * チャットへの編集権限をチェックする
 *
 * 編集条件:
 * - 所有者 または 組織内共有チャット
 */
export const canEditChat = (accessResult: ChatAccessResult): boolean => {
  return accessResult.isOwner || accessResult.isOrganizationShared;
};
