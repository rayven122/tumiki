import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { nameValidationSchema } from "@/schema/validation";
import { AgentIdSchema, McpServerIdSchema } from "@/schema/ids";
import { McpServerVisibilitySchema, AgentSchema } from "@tumiki/db/zod";
import { createAgent } from "./create";
import { updateAgent } from "./update";
import { deleteAgent } from "./delete";
import { findAllAgents } from "./findAll";
import { findAgentById } from "./findById";

// エージェント作成の入力スキーマ
export const CreateAgentInputSchema = z.object({
  name: nameValidationSchema,
  description: z.string().optional(),
  iconPath: z.string().optional(),
  systemPrompt: z.string().min(1, "システムプロンプトは必須です"),
  modelId: z.string().optional(),
  visibility: McpServerVisibilitySchema.default("PRIVATE"),
  mcpServerIds: z.array(McpServerIdSchema).optional(),
});

// エージェント作成の出力スキーマ
export const CreateAgentOutputSchema = z.object({
  id: AgentIdSchema,
});

// エージェント更新の入力スキーマ
export const UpdateAgentInputSchema = z.object({
  id: AgentIdSchema,
  name: nameValidationSchema.optional(),
  description: z.string().optional(),
  iconPath: z.string().nullable().optional(),
  systemPrompt: z.string().min(1).optional(),
  modelId: z.string().nullable().optional(),
  visibility: McpServerVisibilitySchema.optional(),
  mcpServerIds: z.array(McpServerIdSchema).optional(),
});

// エージェント更新の出力スキーマ
export const UpdateAgentOutputSchema = z.object({
  id: AgentIdSchema,
});

// エージェント削除の入力スキーマ
export const DeleteAgentInputSchema = z.object({
  id: AgentIdSchema,
});

// エージェント削除の出力スキーマ
export const DeleteAgentOutputSchema = z.object({
  id: AgentIdSchema,
  name: z.string(),
});

// エージェント詳細取得の入力スキーマ
export const FindByIdInputSchema = z.object({
  id: AgentIdSchema,
});

// createdByの型定義
const CreatedBySchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
  })
  .nullable();

// MCPサーバー情報の型定義
const McpServerInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  iconPath: z.string().nullable(),
});

// スケジュール情報の型定義
const ScheduleInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  cronExpression: z.string(),
  status: z.string(),
});

// エージェント一覧の出力スキーマ
export const FindAllAgentsOutputSchema = z.array(
  AgentSchema.pick({
    id: true,
    name: true,
    description: true,
    iconPath: true,
    systemPrompt: true,
    modelId: true,
    visibility: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
  }).extend({
    createdBy: CreatedBySchema,
    mcpServers: z.array(McpServerInfoSchema),
    schedules: z.array(ScheduleInfoSchema),
    _count: z.object({
      executionLogs: z.number(),
    }),
  }),
);

export const agentRouter = createTRPCRouter({
  // エージェント作成
  create: protectedProcedure
    .input(CreateAgentInputSchema)
    .output(CreateAgentOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await createAgent(
          tx,
          input,
          ctx.currentOrg.id,
          ctx.session.user.id,
        );
      });
    }),

  // エージェント更新
  update: protectedProcedure
    .input(UpdateAgentInputSchema)
    .output(UpdateAgentOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await updateAgent(tx, input, ctx.currentOrg.id);
      });
    }),

  // エージェント削除
  delete: protectedProcedure
    .input(DeleteAgentInputSchema)
    .output(DeleteAgentOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await deleteAgent(tx, {
          id: input.id,
          organizationId: ctx.currentOrg.id,
        });
      });
    }),

  // エージェント一覧取得
  findAll: protectedProcedure
    .output(FindAllAgentsOutputSchema)
    .query(async ({ ctx }) => {
      return await findAllAgents(ctx.db, {
        organizationId: ctx.currentOrg.id,
        userId: ctx.session.user.id,
      });
    }),

  // エージェント詳細取得
  findById: protectedProcedure
    .input(FindByIdInputSchema)
    .query(async ({ ctx, input }) => {
      return await findAgentById(ctx.db, {
        id: input.id,
        organizationId: ctx.currentOrg.id,
        userId: ctx.session.user.id,
      });
    }),
});
