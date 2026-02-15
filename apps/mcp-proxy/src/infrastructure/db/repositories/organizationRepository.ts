/**
 * 組織リポジトリ
 *
 * 組織関連のDBクエリを提供
 */

import { db } from "@tumiki/db/server";

/** 組織のSlack設定 */
export type OrganizationSlackConfig = {
  slug: string;
  slackBotToken: string | null;
};

/**
 * 組織IDからSlack設定を取得
 *
 * @param organizationId - 組織ID
 * @returns Slack設定（見つからない場合はnull）
 */
export const getOrganizationSlackConfig = async (
  organizationId: string,
): Promise<OrganizationSlackConfig | null> => {
  return db.organization.findUnique({
    where: { id: organizationId },
    select: {
      slug: true,
      slackBotToken: true,
    },
  });
};
