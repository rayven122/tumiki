import type { PrismaClient } from "@db-client";
import { upgradeTenant } from "./upgradeTenant";

type UpgradeAllResult = {
  succeeded: number;
  failed: number;
  errors: { slug: string; message: string }[];
};

/**
 * ACTIVE 状態の全テナントを順次アップグレードする。
 *
 * 1件失敗しても残りのテナントの処理を継続し、
 * 最後にまとめた結果を返す。
 */
export const upgradeAllTenants = async (
  db: PrismaClient,
): Promise<UpgradeAllResult> => {
  const tenants = await db.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, slug: true },
  });

  const errors: { slug: string; message: string }[] = [];
  let succeeded = 0;

  for (const tenant of tenants) {
    try {
      // Context 相当のオブジェクトを渡す（headers は内部エンドポイントなので空）
      await upgradeTenant({ db, headers: new Headers() }, { id: tenant.id });
      succeeded++;
    } catch (error) {
      errors.push({
        slug: tenant.slug,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    succeeded,
    failed: errors.length,
    errors,
  };
};
