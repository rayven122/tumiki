import type { PrismaTransactionClient } from "@tumiki/db";
import { createBulkNotifications } from "@/features/notification";
import type { RefreshToolsOutput } from "./refreshTools";

type SendToolChangeNotificationsInput = {
  result: RefreshToolsOutput;
  mcpServerId: string;
  organizationId: string;
  organizationSlug: string;
  triggeredById: string;
};

/**
 * 変更サマリーを作成
 */
const createChangeSummary = (result: RefreshToolsOutput): string => {
  const summaryParts = [
    result.totalAddedCount > 0 && `${result.totalAddedCount}個のツールが追加`,
    result.totalRemovedCount > 0 &&
      `${result.totalRemovedCount}個のツールが削除`,
    result.totalModifiedCount > 0 &&
      `${result.totalModifiedCount}個のツールが変更`,
  ].filter(Boolean) as string[];
  return summaryParts.join("、");
};

/**
 * ツール変更通知を送信
 *
 * - 現在の組織に通知を送信
 * - 同じテンプレートを使用している他の組織にも通知を送信
 */
export const sendToolChangeNotifications = async (
  db: PrismaTransactionClient,
  input: SendToolChangeNotificationsInput,
): Promise<void> => {
  const {
    result,
    mcpServerId,
    organizationId,
    organizationSlug,
    triggeredById,
  } = input;

  // 変更がない場合は何もしない
  if (!result.hasAnyChanges) {
    return;
  }

  const changeSummary = createChangeSummary(result);

  // MCPサーバー名を取得
  const mcpServer = await db.mcpServer.findUnique({
    where: { id: mcpServerId },
    select: { name: true },
  });
  const serverName = mcpServer?.name ?? "";

  // 現在の組織に通知
  void createBulkNotifications(db, {
    type: "MCP_TOOL_CHANGED",
    priority: "NORMAL",
    title: "MCPサーバーのツールが更新されました",
    message: `「${serverName}」のツールが更新されました: ${changeSummary}`,
    linkUrl: `/${organizationSlug}/mcps/${mcpServerId}`,
    organizationId,
    triggeredById,
  });

  // 同じテンプレートを使用している他の組織にも通知
  for (const affectedOrg of result.affectedOrganizations) {
    // 他組織のslugを取得
    const org = await db.organization.findUnique({
      where: { id: affectedOrg.organizationId },
      select: { slug: true },
    });

    void createBulkNotifications(db, {
      type: "MCP_TOOL_CHANGED",
      priority: "HIGH", // 他組織からの変更は重要度を上げる
      title: "共有MCPサーバーのツールが変更されました",
      message: `「${affectedOrg.mcpServerName}」で使用しているMCPサーバーテンプレートのツールが外部から変更されました: ${changeSummary}。ツール一覧を確認してください。`,
      linkUrl: `/${org?.slug ?? affectedOrg.organizationId}/mcps/${affectedOrg.mcpServerId}`,
      organizationId: affectedOrg.organizationId,
      triggeredById,
    });
  }
};
