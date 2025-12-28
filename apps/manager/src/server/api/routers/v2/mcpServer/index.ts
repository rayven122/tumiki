import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { findAll } from "./findAll";
import {
  deleteMcpServerTemplate,
  deleteMcpServerTemplateInputSchema,
  deleteMcpServerTemplateOutputSchema,
} from "./deleteMcpServerTemplate";

export const mcpServerRouter = createTRPCRouter({
  /**
   * MCPサーバーテンプレート一覧を取得
   *
   * 公式テンプレートと組織のカスタムテンプレートを返します。
   */
  findAll: protectedProcedure.query(findAll),

  /**
   * 組織内のMCPサーバーテンプレートを削除
   *
   * 公式テンプレートは削除不可。使用中のテンプレートも削除不可。
   */
  deleteTemplate: protectedProcedure
    .input(deleteMcpServerTemplateInputSchema)
    .output(deleteMcpServerTemplateOutputSchema)
    .mutation(deleteMcpServerTemplate),
});
