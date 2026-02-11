import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { AgentIdSchema, AgentScheduleIdSchema } from "@/schema/ids";
import { ScheduleStatusSchema } from "@tumiki/db/zod";
import { createSchedule } from "./create";
import { updateSchedule } from "./update";
import { deleteSchedule } from "./delete";
import { toggleSchedule } from "./toggle";
import { findSchedulesByAgentId } from "./findByAgentId";
import {
  registerSchedule,
  unregisterSchedule,
  updateSchedule as updateCronSchedule,
} from "@/lib/scheduler";

// Cron式のバリデーション（5フィールド形式: 分 時 日 月 曜日）
const cronExpressionSchema = z
  .string()
  .min(9, "Cron式が短すぎます")
  .max(100, "Cron式が長すぎます");

// タイムゾーンのバリデーション
const timezoneSchema = z.string().default("Asia/Tokyo");

// スケジュール作成入力
export const CreateScheduleInputSchema = z.object({
  agentId: AgentIdSchema,
  name: z.string().min(1, "名前を入力してください").max(100),
  cronExpression: cronExpressionSchema,
  timezone: timezoneSchema,
});

// スケジュール更新入力
export const UpdateScheduleInputSchema = z.object({
  id: AgentScheduleIdSchema,
  name: z.string().min(1).max(100).optional(),
  cronExpression: cronExpressionSchema.optional(),
  timezone: timezoneSchema.optional(),
});

// スケジュール削除入力
export const DeleteScheduleInputSchema = z.object({
  id: AgentScheduleIdSchema,
});

// 有効/無効切り替え入力
export const ToggleScheduleInputSchema = z.object({
  id: AgentScheduleIdSchema,
  status: ScheduleStatusSchema,
});

// エージェント別スケジュール取得入力
export const FindByAgentIdInputSchema = z.object({
  agentId: AgentIdSchema,
});

// スケジュール出力スキーマ
const ScheduleOutputSchema = z.object({
  id: AgentScheduleIdSchema,
  name: z.string(),
  cronExpression: z.string(),
  timezone: z.string(),
  status: ScheduleStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  _count: z.object({
    executionLogs: z.number(),
  }),
});

export const agentScheduleRouter = createTRPCRouter({
  // スケジュール作成
  create: protectedProcedure
    .input(CreateScheduleInputSchema)
    .output(z.object({ id: AgentScheduleIdSchema }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        const schedule = await createSchedule(tx, {
          ...input,
          organizationId: ctx.currentOrg.id,
          userId: ctx.session.user.id,
        });
        // Node Cronに登録
        await registerSchedule(schedule);
        return { id: schedule.id };
      });
    }),

  // スケジュール更新
  update: protectedProcedure
    .input(UpdateScheduleInputSchema)
    .output(z.object({ id: AgentScheduleIdSchema }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        const schedule = await updateSchedule(tx, {
          ...input,
          organizationId: ctx.currentOrg.id,
          userId: ctx.session.user.id,
        });
        // Node Cronを更新
        await updateCronSchedule(schedule);
        return { id: schedule.id };
      });
    }),

  // スケジュール削除
  delete: protectedProcedure
    .input(DeleteScheduleInputSchema)
    .output(z.object({ id: AgentScheduleIdSchema, name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        const result = await deleteSchedule(tx, {
          id: input.id,
          organizationId: ctx.currentOrg.id,
          userId: ctx.session.user.id,
        });
        // Node Cronから削除
        unregisterSchedule(input.id);
        return result;
      });
    }),

  // 有効/無効切り替え
  toggle: protectedProcedure
    .input(ToggleScheduleInputSchema)
    .output(z.object({ id: AgentScheduleIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const schedule = await toggleSchedule(ctx.db, {
        id: input.id,
        status: input.status,
        organizationId: ctx.currentOrg.id,
        userId: ctx.session.user.id,
      });
      // Node Cronを更新
      if (input.status === "ACTIVE") {
        await registerSchedule(schedule);
      } else {
        unregisterSchedule(input.id);
      }
      return { id: schedule.id };
    }),

  // エージェントのスケジュール一覧
  findByAgentId: protectedProcedure
    .input(FindByAgentIdInputSchema)
    .output(z.array(ScheduleOutputSchema))
    .query(async ({ ctx, input }) => {
      return await findSchedulesByAgentId(ctx.db, {
        agentId: input.agentId,
        organizationId: ctx.currentOrg.id,
        userId: ctx.session.user.id,
      });
    }),
});
