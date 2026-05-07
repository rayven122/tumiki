import { db } from "@/server/db";

/**
 * ヘルスチェックエンドポイント
 * Kubernetes liveness/readiness probe + Dockerfile HEALTHCHECK 用。
 * DB 疎通も確認することで、DB 障害時に Pod を unhealthy として検出できるようにする。
 */
export const GET = async () => {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    return Response.json(
      { status: "error", message: "database unreachable" },
      { status: 503 },
    );
  }
};
