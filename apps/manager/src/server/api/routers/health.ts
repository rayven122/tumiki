import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

/**
 * ヘルスチェック用ルーター
 * Desktop app からの接続確認、本番環境のヘルスチェックに使用
 */
export const healthRouter = createTRPCRouter({
  /**
   * サーバーの生存確認（認証不要）
   */
  ping: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date(),
      message: "pong",
    };
  }),

  /**
   * サーバー情報取得（認証不要）
   */
  getServerInfo: publicProcedure.query(() => {
    return {
      version: "0.1.0",
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
    };
  }),
});
