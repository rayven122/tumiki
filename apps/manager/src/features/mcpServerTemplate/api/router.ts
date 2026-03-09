import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// スキーマ定義
import {
  listMcpServerTemplatesInputSchema,
  listMcpServerTemplatesOutputSchema,
  getMcpServerTemplateInputSchema,
  getMcpServerTemplateOutputSchema,
  createMcpServerTemplateInputSchema,
  createMcpServerTemplateOutputSchema,
  updateMcpServerTemplateInputSchema,
  updateMcpServerTemplateOutputSchema,
  deleteMcpServerTemplateInputSchema,
  deleteMcpServerTemplateOutputSchema,
} from "./schemas";

// エンドポイント関数のインポート
import { listMcpServerTemplates } from "./list";
import { getMcpServerTemplate } from "./get";
// EE機能: テンプレート作成（CE版ビルド時はwebpackが.tsにリダイレクト）
import { createMcpServerTemplate } from "./create.ee";
// EE機能: テンプレート更新（CE版ビルド時はwebpackが.tsにリダイレクト）
import { updateMcpServerTemplate } from "./update.ee";
// EE機能: テンプレート削除（CE版ビルド時はwebpackが.tsにリダイレクト）
import { deleteMcpServerTemplate } from "./delete.ee";

/**
 * MCPサーバーテンプレート Router
 *
 * MCPサーバーテンプレート管理に関する API
 */
export const mcpServerTemplateRouter = createTRPCRouter({
  // テンプレート一覧取得
  list: protectedProcedure
    .input(listMcpServerTemplatesInputSchema)
    .output(listMcpServerTemplatesOutputSchema)
    .query(listMcpServerTemplates),

  // テンプレート詳細取得
  get: protectedProcedure
    .input(getMcpServerTemplateInputSchema)
    .output(getMcpServerTemplateOutputSchema)
    .query(getMcpServerTemplate),

  // テンプレート作成 - EE機能
  create: protectedProcedure
    .input(createMcpServerTemplateInputSchema)
    .output(createMcpServerTemplateOutputSchema)
    .mutation(createMcpServerTemplate),

  // テンプレート更新 - EE機能
  update: protectedProcedure
    .input(updateMcpServerTemplateInputSchema)
    .output(updateMcpServerTemplateOutputSchema)
    .mutation(updateMcpServerTemplate),

  // テンプレート削除 - EE機能
  delete: protectedProcedure
    .input(deleteMcpServerTemplateInputSchema)
    .output(deleteMcpServerTemplateOutputSchema)
    .mutation(deleteMcpServerTemplate),
});
