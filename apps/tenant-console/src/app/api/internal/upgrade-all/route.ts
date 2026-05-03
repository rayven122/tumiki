import "server-only";
import { db } from "@/server/db";
import { upgradeAllTenants } from "@/features/tenants/api/upgradeAllTenants";

// CronJob から呼ばれる内部エンドポイント。INTERNAL_API_SECRET で保護。
export const POST = async (request: Request) => {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await upgradeAllTenants(db);
  return Response.json(result);
};
