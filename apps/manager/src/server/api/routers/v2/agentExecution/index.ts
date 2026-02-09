import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { AgentIdSchema, AgentExecutionLogIdSchema } from "@/schema/ids";
import { findExecutionsByAgentId } from "./findByAgentId";
import { getAllRunningExecutions } from "./getAllRunning";

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
  agentIconPath: z.string().nullable(),
  modelId: z.string().nullable(),
  estimatedDurationMs: z.number(),
  createdAt: z.date(),
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
});
