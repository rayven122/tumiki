import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { AgentIdSchema, AgentExecutionLogIdSchema } from "@/schema/ids";
import { findExecutionsByAgentId } from "./findByAgentId";

// 実行履歴取得入力
export const FindExecutionByAgentIdInputSchema = z.object({
  agentId: AgentIdSchema,
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// 実行履歴出力
const ExecutionLogSchema = z.object({
  id: AgentExecutionLogIdSchema,
  scheduleId: z.string().nullable(),
  scheduleName: z.string().nullable(),
  success: z.boolean(),
  durationMs: z.number().nullable(),
  createdAt: z.date(),
});

// ページネーション出力
const PaginatedExecutionLogsSchema = z.object({
  items: z.array(ExecutionLogSchema),
  nextCursor: z.string().optional(),
});

export const agentExecutionRouter = createTRPCRouter({
  // 実行履歴取得
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
});
