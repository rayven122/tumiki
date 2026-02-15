import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import {
  displayNameValidationSchema,
  alphanumericWithHyphenUnderscoreSchema,
} from "@/schema/validation";
import { AgentIdSchema, McpServerIdSchema } from "@/schema/ids";
import {
  McpServerVisibilitySchema,
  AgentSchema,
  NotificationPrioritySchema,
} from "@tumiki/db/zod";
import { createAgent } from "./create";
import { updateAgent } from "./update";
import { deleteAgent } from "./delete";
import { findAllAgents } from "./findAll";
import { findAgentById } from "./findById";
import { findAgentBySlug } from "./findBySlug";

// エージェントスラグのバリデーションスキーマ
export const AgentSlugSchema = alphanumericWithHyphenUnderscoreSchema
  .min(1, "スラグは必須です")
  .max(50, "スラグは50文字以内で入力してください");

// Slack通知設定の共通スキーマ（EE機能）
const SlackNotificationFieldsSchema = z.object({
  enableSlackNotification: z.boolean().optional(),
  slackNotificationChannelId: z.string().optional(),
  notificationPriority: NotificationPrioritySchema.optional(),
  notifyOnlyOnFailure: z.boolean().optional(),
});

// エージェント作成の入力スキーマ
export const CreateAgentInputSchema = z
  .object({
    name: displayNameValidationSchema,
    slug: AgentSlugSchema.optional(),
    description: z.string().optional(),
    iconPath: z.string().optional(),
    systemPrompt: z.string().min(1, "システムプロンプトは必須です"),
    modelId: z.string().optional(),
    visibility: McpServerVisibilitySchema.default("PRIVATE"),
    mcpServerIds: z.array(McpServerIdSchema).optional(),
  })
  .merge(SlackNotificationFieldsSchema);

// エージェント作成の出力スキーマ
export const CreateAgentOutputSchema = z.object({
  id: AgentIdSchema,
  slug: z.string(),
});

// 更新用Slack通知設定（nullable対応）
const SlackNotificationFieldsForUpdateSchema = z.object({
  enableSlackNotification: z.boolean().optional(),
  slackNotificationChannelId: z.string().nullable().optional(),
  notificationPriority: NotificationPrioritySchema.optional(),
  notifyOnlyOnFailure: z.boolean().optional(),
});

// エージェント更新の入力スキーマ
export const UpdateAgentInputSchema = z
  .object({
    id: AgentIdSchema,
    name: displayNameValidationSchema.optional(),
    slug: AgentSlugSchema.optional(),
    description: z.string().optional(),
    iconPath: z.string().nullable().optional(),
    systemPrompt: z.string().min(1).optional(),
    modelId: z.string().nullable().optional(),
    visibility: McpServerVisibilitySchema.optional(),
    mcpServerIds: z.array(McpServerIdSchema).optional(),
  })
  .merge(SlackNotificationFieldsForUpdateSchema);

// エージェント更新の出力スキーマ
export const UpdateAgentOutputSchema = z.object({
  id: AgentIdSchema,
});

// エージェント削除の入力スキーマ
export const DeleteAgentInputSchema = z.object({
  id: AgentIdSchema,
});

// アイコンパス更新の入力スキーマ
export const UpdateIconPathInputSchema = z.object({
  id: AgentIdSchema,
  iconPath: z.string().nullable(),
});

// アイコンパス更新の出力スキーマ
export const UpdateIconPathOutputSchema = z.object({
  id: AgentIdSchema,
});

// エージェント削除の出力スキーマ
export const DeleteAgentOutputSchema = z.object({
  id: AgentIdSchema,
  name: z.string(),
});

// エージェント詳細取得の入力スキーマ（ID指定）
export const FindByIdInputSchema = z.object({
  id: AgentIdSchema,
});

// エージェント詳細取得の入力スキーマ（スラグ指定）
export const FindBySlugInputSchema = z.object({
  slug: AgentSlugSchema,
});

// 実行メッセージ取得の入力スキーマ
export const GetExecutionMessagesInputSchema = z.object({
  chatId: z.string(),
});

/** 実行メッセージの出力スキーマ（partsはJSON形式で保存されている） */
export const GetExecutionMessagesOutputSchema = z.array(
  z.object({
    id: z.string(),
    role: z.string(),
    parts: z.array(z.record(z.string(), z.unknown())),
    createdAt: z.date(),
  }),
);

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
  slug: z.string(),
  name: z.string(),
  iconPath: z.string().nullable(),
  // テンプレートのiconPathとツール数を取得
  templateInstances: z
    .array(
      z.object({
        mcpServerTemplate: z.object({
          iconPath: z.string().nullable(),
          _count: z.object({
            mcpTools: z.number(),
          }),
        }),
      }),
    )
    .optional(),
});

// スケジュール情報の型定義
const ScheduleInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  cronExpression: z.string(),
  timezone: z.string(),
  status: z.string(),
});

// 最後の実行ログスキーマ
const LastExecutionLogSchema = z.object({
  id: z.string(),
  success: z.boolean().nullable(),
  durationMs: z.number().nullable(),
  createdAt: z.date(),
});

// エージェント一覧の出力スキーマ
export const FindAllAgentsOutputSchema = z.array(
  AgentSchema.pick({
    id: true,
    slug: true,
    organizationId: true,
    name: true,
    description: true,
    iconPath: true,
    systemPrompt: true,
    modelId: true,
    visibility: true,
    estimatedDurationMs: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
    // Slack通知設定（EE機能）
    enableSlackNotification: true,
    slackNotificationChannelId: true,
    notificationPriority: true,
    notifyOnlyOnFailure: true,
  }).extend({
    createdBy: CreatedBySchema,
    mcpServers: z.array(McpServerInfoSchema),
    schedules: z.array(ScheduleInfoSchema),
    _count: z.object({
      executionLogs: z.number(),
    }),
    executionLogs: z.array(LastExecutionLogSchema),
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

  // エージェント詳細取得（ID指定）
  findById: protectedProcedure
    .input(FindByIdInputSchema)
    .query(async ({ ctx, input }) => {
      return await findAgentById(ctx.db, {
        id: input.id,
        organizationId: ctx.currentOrg.id,
        userId: ctx.session.user.id,
      });
    }),

  // エージェント詳細取得（スラグ指定）
  findBySlug: protectedProcedure
    .input(FindBySlugInputSchema)
    .query(async ({ ctx, input }) => {
      return await findAgentBySlug(ctx.db, {
        slug: input.slug,
        organizationId: ctx.currentOrg.id,
        userId: ctx.session.user.id,
      });
    }),

  // アイコンパス更新
  updateIconPath: protectedProcedure
    .input(UpdateIconPathInputSchema)
    .output(UpdateIconPathOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.agent.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.currentOrg.id,
        },
        select: { id: true },
      });

      if (!agent) {
        throw new Error("エージェントが見つかりません");
      }

      await ctx.db.agent.update({
        where: { id: input.id },
        data: { iconPath: input.iconPath },
      });

      // 入力で検証済みのIDをそのまま返す
      return { id: input.id };
    }),

  // 実行結果のメッセージ取得
  getExecutionMessages: protectedProcedure
    .input(GetExecutionMessagesInputSchema)
    .output(GetExecutionMessagesOutputSchema)
    .query(async ({ ctx, input }) => {
      // チャットの存在確認と権限チェック（組織内のチャットのみアクセス可能）
      const chat = await ctx.db.chat.findFirst({
        where: {
          id: input.chatId,
          organizationId: ctx.currentOrg.id,
        },
        select: { id: true },
      });

      if (!chat) {
        throw new Error("チャットが見つかりません");
      }

      // メッセージを取得
      const messages = await ctx.db.message.findMany({
        where: { chatId: input.chatId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          parts: true,
          createdAt: true,
        },
      });

      // partsをパースして返す（JSONからオブジェクト配列にキャスト）
      return messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: Array.isArray(msg.parts)
          ? (msg.parts as Record<string, unknown>[])
          : [],
        createdAt: msg.createdAt,
      }));
    }),
});
