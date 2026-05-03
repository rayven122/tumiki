import "server-only";
import { db } from "@/server/db";
import { upgradeAllTenants } from "@/features/tenants/api/upgradeAllTenants";

/**
 * POST /api/internal/upgrade-all
 *
 * CronJob から呼ばれる内部エンドポイント。
 * Cloudflare Access の外側には露出しないため認証は不要。
 * ACTIVE な全テナントを順次 helm upgrade する。
 */
export const POST = async () => {
  const result = await upgradeAllTenants(db);
  return Response.json(result);
};
