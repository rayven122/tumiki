/**
 * 組織メンバーシップ検証ユーティリティ
 *
 * 認証ミドルウェア間で共通の組織メンバーシップチェックロジックを提供
 */

import { checkOrganizationMembership } from "../../services/mcpServerService.js";
import { logError } from "../logger/index.js";

/**
 * 組織メンバーシップ検証結果の型
 */
export type MembershipCheckResult =
  | {
      isMember: true;
    }
  | {
      isMember: false;
      error: "check_failed" | "not_a_member";
    };

/**
 * 組織メンバーシップを検証
 *
 * 既存の checkOrganizationMembership をラップし、
 * エラーハンドリングと結果の標準化を行う
 *
 * @param organizationId - 組織ID
 * @param userId - ユーザーID
 * @returns 検証結果（成功/失敗とエラータイプ）
 */
export const validateOrganizationMembership = async (
  organizationId: string,
  userId: string,
): Promise<MembershipCheckResult> => {
  try {
    const isMember = await checkOrganizationMembership(organizationId, userId);

    if (!isMember) {
      return { isMember: false, error: "not_a_member" };
    }

    return { isMember: true };
  } catch (error) {
    logError("Organization membership check failed", error as Error, {
      organizationId,
      userId,
    });
    return { isMember: false, error: "check_failed" };
  }
};
