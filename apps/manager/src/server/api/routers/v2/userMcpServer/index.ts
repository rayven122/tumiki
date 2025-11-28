import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { nameValidationSchema } from "@/schema/validation";
import { createApiKeyMcpServer } from "./createApiKeyMcpServer";
import { createOAuthMcpServer } from "./createOAuthMcpServer";
import { updateOfficialServer } from "./update";

// APIキー認証MCPサーバー作成用の入力スキーマ
export const CreateApiKeyMcpServerInputV2 = z
  .object({
    mcpServerTemplateId: z.string().optional(),
    customUrl: z.string().url().optional(),
    envVars: z.record(z.string(), z.string()).optional(),
    name: nameValidationSchema,
    description: z.string().optional(),
  })
  .refine((data) => data.mcpServerTemplateId ?? data.customUrl, {
    message: "mcpServerTemplateId または customUrl のいずれかが必要です",
  });

export const CreateApiKeyMcpServerOutputV2 = z.object({
  id: z.string(),
  mcpConfigId: z.string(),
});

// OAuth認証MCPサーバー作成用の入力スキーマ
export const CreateOAuthMcpServerInputV2 = z.object({
  // テンプレートIDまたはカスタムURL（いずれか必須）
  templateId: z.string().optional(),
  customUrl: z.string().url().optional(),

  // サーバー情報
  name: nameValidationSchema.optional(),
  description: z.string().optional(),
});

export const CreateOAuthMcpServerOutputV2 = z.object({
  id: z.string(),
  authorizationUrl: z.string(),
});

export const UpdateOfficialServerInputV2 = z.object({
  id: z.string(),
  envVars: z.record(z.string(), z.string()),
});

export const UpdateOfficialServerOutputV2 = z.object({
  id: z.string(),
});

export const userMcpServerRouter = createTRPCRouter({
  // APIキー認証MCPサーバー作成
  createApiKeyMcpServer: protectedProcedure
    .input(CreateApiKeyMcpServerInputV2)
    .output(CreateApiKeyMcpServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await createApiKeyMcpServer(
          tx,
          input,
          ctx.currentOrganizationId,
          ctx.session.user.id,
        );
      });
    }),

  // OAuth認証MCPサーバー作成
  createOAuthMcpServer: protectedProcedure
    .input(CreateOAuthMcpServerInputV2)
    .output(CreateOAuthMcpServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await createOAuthMcpServer(
          tx,
          input,
          ctx.currentOrganizationId,
          ctx.session.user.id,
        );
      });
    }),

  update: protectedProcedure
    .input(UpdateOfficialServerInputV2)
    .output(UpdateOfficialServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await updateOfficialServer(
          tx,
          input,
          ctx.currentOrganizationId,
          ctx.session.user.id,
        );
      });
    }),
});
