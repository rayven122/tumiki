import { db } from "@tumiki/db/server";

/**
 * 全ての組織データを削除する
 * ⚠️  警告: この操作は取り消せません
 *
 * 削除順序:
 * 1. OrganizationInvitation - 招待レコード
 * 2. OrganizationMember - メンバーシップ
 * 3. McpConfig - MCP設定（組織に関連付けられているもの）
 * 4. Organization - 組織本体（カスケード削除で関連データも削除）
 */
const deleteAllOrganizations = async () => {
  console.log("⚠️  全ての組織データを削除します...");
  console.log("この操作は取り消せません。");
  console.log("");

  try {
    await db.$transaction(async (tx) => {
      // 1. OrganizationInvitation削除
      const deletedInvitations = await tx.organizationInvitation.deleteMany({});
      console.log(`✓ ${deletedInvitations.count}件の招待を削除しました`);

      // 2. OrganizationMember削除
      const deletedMembers = await tx.organizationMember.deleteMany({});
      console.log(`✓ ${deletedMembers.count}件のメンバーを削除しました`);

      // 3. McpConfig削除（組織に関連付けられているもの）
      const deletedConfigs = await tx.mcpConfig.deleteMany({});
      console.log(`✓ ${deletedConfigs.count}件のMCP設定を削除しました`);

      // 4. Organization削除
      // カスケード削除により、以下のデータも自動削除されます:
      // - McpServer
      // - McpServerTemplate
      // - McpOAuthClient
      // - McpOAuthToken
      // - Feedback
      const deletedOrgs = await tx.organization.deleteMany({});
      console.log(`✓ ${deletedOrgs.count}件の組織を削除しました`);

      console.log("");
      console.log("✅ 全ての組織データの削除が完了しました");
    });
  } catch (error) {
    console.error("");
    console.error("❌ エラーが発生しました:");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    throw error;
  }
};

try {
  await deleteAllOrganizations();
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await db.$disconnect();
  process.exit(0);
}
