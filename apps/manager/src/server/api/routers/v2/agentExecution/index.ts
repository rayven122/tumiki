import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { AgentIdSchema, AgentExecutionLogIdSchema } from "@/schema/ids";
import { findExecutionsByAgentId } from "./findByAgentId";
import { getAllRunningExecutions } from "./getAllRunning";
import { getRecentExecutions } from "./getRecentExecutions";

export const FindExecutionByAgentIdInputSchema = z.object({
  agentId: AgentIdSchema,
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

const ExecutionLogSchema = z.object({
  id: AgentExecutionLogIdSchema,
  scheduleId: z.string().nullable(),
  chatId: z.string().nullable(),
  scheduleName: z.string().nullable(),
  modelId: z.string().nullable(),
  success: z.boolean(),
  durationMs: z.number().nullable(),
  createdAt: z.date(),
});

// 全エージェントの稼働中実行スキーマ（進捗計算用データ含む）
const AllRunningExecutionSchema = z.object({
  id: AgentExecutionLogIdSchema,
  agentId: AgentIdSchema,
  chatId: z.string().nullable(),
  scheduleId: z.string().nullable(),
  scheduleName: z.string().nullable(),
  agentName: z.string(),
  agentSlug: z.string(),
  agentIconPath: z.string().nullable(),
  modelId: z.string().nullable(),
  estimatedDurationMs: z.number(),
  createdAt: z.date(),
  latestMessage: z.string().nullable(),
});

// メッセージパーツスキーマ
const MessagePartSchema = z.record(z.string(), z.unknown());

// メッセージスキーマ
const ExecutionMessageSchema = z.object({
  id: z.string(),
  role: z.string(),
  parts: z.array(MessagePartSchema),
  createdAt: z.date(),
});

const PaginatedExecutionLogsSchema = z.object({
  items: z.array(ExecutionLogSchema),
  nextCursor: z.string().optional(),
});

// 直近の実行履歴スキーマ（成功/失敗/実行中すべて含む）
const RecentExecutionSchema = z.object({
  id: AgentExecutionLogIdSchema,
  chatId: z.string().nullable(),
  success: z.boolean().nullable(), // null = 実行中, true = 成功, false = 失敗
  agentSlug: z.string(),
  latestMessage: z.string().nullable(),
  createdAt: z.date(),
});

// ページネーション対応の直近実行履歴スキーマ
const PaginatedRecentExecutionsSchema = z.object({
  items: z.array(RecentExecutionSchema),
  nextCursor: z.string().optional(),
});

export const agentExecutionRouter = createTRPCRouter({
  findByAgentId: protectedProcedure
    .input(FindExecutionByAgentIdInputSchema)
    .output(PaginatedExecutionLogsSchema)
    .query(async ({ ctx, input }) => {
      return await findExecutionsByAgentId(ctx.db, {
        agentId: input.agentId,
        organizationId: ctx.currentOrg.id,
        userId: ctx.session.user.id,
        limit: input.limit,
        cursor: input.cursor,
      });
    }),

  getAllRunning: protectedProcedure
    .output(z.array(AllRunningExecutionSchema))
    .query(async ({ ctx }) => {
      return await getAllRunningExecutions(ctx.db, {
        organizationId: ctx.currentOrg.id,
        userId: ctx.session.user.id,
      });
    }),

  /** chatIdからメッセージを取得（実行中のエージェント用） */
  getMessages: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .output(z.array(ExecutionMessageSchema))
    .query(async ({ ctx, input }) => {
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

      return messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: (msg.parts ?? []) as Record<string, unknown>[],
        createdAt: msg.createdAt,
      }));
    }),

  /** 直近の実行履歴を取得（カーソルベースページネーション対応） */
  getRecent: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
          cursor: z.string().optional(),
        })
        .optional(),
    )
    .output(PaginatedRecentExecutionsSchema)
    .query(async ({ ctx, input }) => {
      return await getRecentExecutions(ctx.db, {
        organizationId: ctx.currentOrg.id,
        userId: ctx.session.user.id,
        limit: input?.limit ?? 10,
        cursor: input?.cursor,
      });
    }),
});
