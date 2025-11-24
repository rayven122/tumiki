#!/usr/bin/env tsx

/**
 * McpServerRequestData と McpServerRequestLog の全データを削除するスクリプト
 *
 * 使用方法:
 * cd packages/db && pnpm clear-mcp-data
 *
 * または直接実行:
 * cd scripts && tsx clear-mcp-request-data.ts
 */
import { createInterface } from "readline";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * ユーザーに確認を求める関数
 */
const askConfirmation = async (question: string): Promise<boolean> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
};

/**
 * データ削除前の件数確認
 */
const getRecordCounts = async () => {
  const requestLogCount = await prisma.mcpServerRequestLog.count();

  return {
    requestLogCount,
  };
};

/**
 * メイン処理
 */
const main = async () => {
  try {
    console.log(
      "🔍 McpServerRequestData と McpServerRequestLog 削除スクリプト",
    );
    console.log("=".repeat(60));

    // 削除前の件数確認
    console.log("📊 現在のデータ件数を確認中...");
    const beforeCounts = await getRecordCounts();

    console.log(`\n現在のデータ件数:`);
    console.log(
      `  - McpServerRequestLog: ${beforeCounts.requestLogCount.toLocaleString()} 件`,
    );

    if (beforeCounts.requestLogCount === 0) {
      console.log("\n✅ 削除対象のデータが存在しません。");
      return;
    }

    // 削除確認
    console.log("\n⚠️  警告: 以下のテーブルの全データが削除されます:");
    console.log("  - McpServerRequestLog (MCPリクエストログ)");
    console.log("\n🚨 この操作は元に戻すことができません。");

    const confirmed = await askConfirmation("\n本当に削除しますか？ (y/N): ");

    if (!confirmed) {
      console.log("\n❌ 削除処理をキャンセルしました。");
      return;
    }

    console.log("\n🗑️  データ削除処理を開始します...");

    // トランザクションでの削除処理
    const result = await prisma.$transaction(async (tx) => {
      // McpServerRequestLog を削除
      const deletedRequestLog = await tx.mcpServerRequestLog.deleteMany({});
      console.log(
        `  ✅ McpServerRequestLog: ${deletedRequestLog.count.toLocaleString()} 件削除`,
      );

      return {
        deletedRequestLog: deletedRequestLog.count,
      };
    });

    // 削除後の確認
    const afterCounts = await getRecordCounts();

    console.log("\n🎉 削除処理が正常に完了しました！");
    console.log("\n📈 削除結果:");
    console.log(
      `  - McpServerRequestLog: ${result.deletedRequestLog.toLocaleString()} 件削除`,
    );

    console.log("\n📊 削除後のデータ件数:");
    console.log(
      `  - McpServerRequestLog: ${afterCounts.requestLogCount.toLocaleString()} 件`,
    );
  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

// スクリプト実行
main().catch((error) => {
  console.error("❌ 予期しないエラーが発生しました:", error);
  process.exit(1);
});
