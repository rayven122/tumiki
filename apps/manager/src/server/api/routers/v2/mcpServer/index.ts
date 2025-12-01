import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { findAll } from "./findAll";

export const mcpServerRouter = createTRPCRouter({
  /**
   * 公開MCPサーバーテンプレート一覧を取得
   *
   * グローバルな公開テンプレート（organizationId が null）のみを返します。
   */
  findAll: protectedProcedure.query(findAll),
});
