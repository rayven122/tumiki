import { readFile } from "fs/promises";
import { resolve } from "path";

import type { Prisma } from "@tumiki/db";
import { db } from "@tumiki/db/server";

interface WaitingListData {
  id?: string;
  email: string;
  name?: string | null;
  company?: string | null;
  useCase?: string | null;
  createdAt?: string;
}

interface MigrationOptions {
  jsonFilePath: string;
  skipDuplicates?: boolean;
  dryRun?: boolean;
  batchSize?: number;
}

/**
 * WaitingListデータをJSONファイルから読み込んでデータベースに移行する
 */
export async function migrateWaitingList(options: MigrationOptions) {
  const {
    jsonFilePath,
    skipDuplicates = true,
    dryRun = false,
    batchSize = 100,
  } = options;

  console.log("=== WaitingList データ移行開始 ===");
  console.log(`JSONファイル: ${jsonFilePath}`);
  console.log(`重複スキップ: ${skipDuplicates}`);
  console.log(`ドライラン: ${dryRun}`);
  console.log(`バッチサイズ: ${batchSize}`);
  console.log("");

  try {
    // JSONファイルを読み込み
    const absolutePath = resolve(jsonFilePath);
    const fileContent = await readFile(absolutePath, "utf-8");
    const jsonData: WaitingListData[] = JSON.parse(
      fileContent,
    ) as WaitingListData[];

    console.log(`読み込みデータ数: ${jsonData.length}`);

    if (dryRun) {
      console.log("\n[ドライランモード] 以下のデータが処理されます:");
      jsonData.slice(0, 5).forEach((data, index) => {
        console.log(
          `${index + 1}. email: ${data.email}, name: ${data.name ?? "未設定"}, company: ${data.company ?? "未設定"}`,
        );
      });
      if (jsonData.length > 5) {
        console.log(`... 他 ${jsonData.length - 5} 件`);
      }
      return { processed: 0, skipped: 0, errors: 0 };
    }

    // 既存のメールアドレスを取得
    const existingEmails = await db.waitingList.findMany({
      select: { email: true },
    });
    const existingEmailSet = new Set(
      existingEmails.map((e: { email: string }) => e.email),
    );

    // データを変換
    const dataToInsert: Prisma.WaitingListCreateManyInput[] = [];
    let skippedCount = 0;

    for (const data of jsonData) {
      if (skipDuplicates && existingEmailSet.has(data.email)) {
        console.log(`スキップ: ${data.email} (既に存在)`);
        skippedCount++;
        continue;
      }

      dataToInsert.push({
        id: data.id,
        email: data.email,
        name: data.name ?? null,
        company: data.company ?? null,
        useCase: data.useCase ?? null,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      });
    }

    // バッチ処理で挿入
    let processedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < dataToInsert.length; i += batchSize) {
      const batch = dataToInsert.slice(i, i + batchSize);

      try {
        const result = await db.waitingList.createMany({
          data: batch,
          skipDuplicates,
        });

        processedCount += result.count;
        console.log(
          `バッチ ${Math.floor(i / batchSize) + 1}: ${result.count} 件挿入完了`,
        );
      } catch (error) {
        errorCount += batch.length;
        console.error(`バッチ ${Math.floor(i / batchSize) + 1} エラー:`, error);

        // 個別に挿入を試みる
        if (!skipDuplicates) {
          for (const item of batch) {
            try {
              await db.waitingList.create({ data: item });
              processedCount++;
              errorCount--;
            } catch (itemError) {
              console.error(`個別挿入エラー (${item.email}):`, itemError);
            }
          }
        }
      }
    }

    console.log("\n=== 移行完了 ===");
    console.log(`処理済み: ${processedCount} 件`);
    console.log(`スキップ: ${skippedCount} 件`);
    console.log(`エラー: ${errorCount} 件`);
    console.log(`合計: ${jsonData.length} 件`);

    return {
      processed: processedCount,
      skipped: skippedCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error("移行エラー:", error);
    throw error;
  }
}

// CLIから実行される場合
if (import.meta.url === `file://${process.argv[1]}`) {
  const jsonFilePath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  const skipDuplicates = !process.argv.includes("--no-skip-duplicates");

  if (!jsonFilePath) {
    console.error(
      "使用方法: bun run src/migrateWaitingList.ts <JSONファイルパス> [--dry-run] [--no-skip-duplicates]",
    );
    process.exit(1);
  }

  migrateWaitingList({
    jsonFilePath,
    dryRun,
    skipDuplicates,
  })
    .then(() => {
      console.log("\n移行処理が完了しました");
    })
    .catch((error) => {
      console.error("\n移行処理中にエラーが発生しました:", error);
      process.exit(1);
    })
    .finally(() => {
      void db.$disconnect();
    });
}
