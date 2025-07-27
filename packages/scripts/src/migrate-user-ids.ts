import { PrismaClient } from "@tumiki/db";
import { extractUserIdFromSub, isAuth0Sub } from "@tumiki/utils";

const prisma = new PrismaClient();

/**
 * 既存のユーザーIDを Auth0 sub 形式から userId のみに変換するマイグレーションスクリプト
 */
const migrateUserIds = async () => {
  console.log("Starting user ID migration...");

  try {
    // 1. 現在のユーザーを取得
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
      },
    });

    console.log(`Found ${users.length} users to process`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Auth0 sub 形式でない場合はスキップ（既に移行済み）
      if (!isAuth0Sub(user.id)) {
        console.log(`Skipping user ${user.id} (already migrated)`);
        skippedCount++;
        continue;
      }

      const newId = extractUserIdFromSub(user.id);
      console.log(`Migrating user: ${user.id} → ${newId}`);

      // トランザクションで関連データも含めて更新
      await prisma.$transaction(async (tx) => {
        // 新しいIDで一時的なユーザーを作成
        await tx.user.create({
          data: {
            id: newId,
            name: null,
            email: `temp_${Date.now()}@migration.local`,
            image: null,
            role: "USER",
            hasCompletedOnboarding: false,
          },
        });

        // 関連テーブルのuserIdを更新
        await tx.userToolGroup.updateMany({
          where: { userId: user.id },
          data: { userId: newId },
        });

        await tx.userMcpServerConfig.updateMany({
          where: { userId: user.id },
          data: { userId: newId },
        });

        await tx.userMcpServerInstance.updateMany({
          where: { userId: user.id },
          data: { userId: newId },
        });

        // McpServerテーブルにcreatedByUserIdフィールドがない場合はコメントアウト
        // await tx.mcpServer.updateMany({
        //   where: { createdByUserId: user.id },
        //   data: { createdByUserId: newId },
        // });

        await tx.mcpApiKey.updateMany({
          where: { userId: user.id },
          data: { userId: newId },
        });

        await tx.organizationMember.updateMany({
          where: { userId: user.id },
          data: { userId: newId },
        });

        // OrganizationInvitationテーブルにinvitedByUserIdフィールドがない場合はコメントアウト
        // await tx.organizationInvitation.updateMany({
        //   where: { invitedByUserId: user.id },
        //   data: { invitedByUserId: newId },
        // });

        await tx.chat.updateMany({
          where: { userId: user.id },
          data: { userId: newId },
        });

        await tx.document.updateMany({
          where: { userId: user.id },
          data: { userId: newId },
        });

        await tx.suggestion.updateMany({
          where: { userId: user.id },
          data: { userId: newId },
        });

        await tx.mcpServerRequestLog.updateMany({
          where: { userId: user.id },
          data: { userId: newId },
        });

        // 元のユーザーレコードを削除
        await tx.user.delete({
          where: { id: user.id },
        });

        // 一時ユーザーのデータで更新
        await tx.user.update({
          where: { id: newId },
          data: {
            email: user.email,
            // 他のフィールドは元のデータから取得する必要がある場合は追加
          },
        });
      });

      migratedCount++;
      console.log(`Successfully migrated user ${user.id} to ${newId}`);
    }

    console.log(`\nMigration completed:`);
    console.log(`- Migrated: ${migratedCount} users`);
    console.log(`- Skipped: ${skippedCount} users (already migrated)`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

// スクリプト実行時の確認
const main = async () => {
  console.log("=== User ID Migration Script ===");
  console.log(
    "This script will migrate user IDs from Auth0 sub format to plain IDs",
  );
  console.log("Example: 'github|123456' → '123456'");
  console.log("\nWARNING: This operation will modify the database!");
  console.log("Make sure to backup your database before proceeding.\n");

  const args = process.argv.slice(2);
  if (args[0] !== "--confirm") {
    console.log(
      "To run this migration, use: bun run migrate-user-ids.ts --confirm",
    );
    process.exit(0);
  }

  await migrateUserIds();
};

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
