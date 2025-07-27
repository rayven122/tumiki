import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { addCustomServer } from "./addCustomServer";
import {
  UserMcpServerInstanceIdSchema,
  UserToolGroupIdSchema,
  ToolIdSchema,
  UserMcpServerConfigIdSchema,
} from "@/schema/ids";
import { findCustomServers } from "./findCustomServers";

import {
  McpApiKeySchema,
  McpServerSchema,
  UserMcpServerInstanceSchema,
} from "@tumiki/db/zod";

import { findOfficialServers } from "./findOfficialServers";
import { deleteServerInstance } from "./deleteServerInstance";
import { updateServerInstance } from "./updateServerInstance";
import { updateServerInstanceName } from "./updateServerInstanceName";
import { addOfficialServer } from "./addOfficialServer";
import { updateServerStatus } from "./updateServerStatus";
import { findById } from "./findById";
import { findRequestLogs } from "./findRequestLogs";
import { getRequestStats } from "./getRequestStats";
import { getToolStats } from "./getToolStats";
import { getTimeSeriesStats } from "./getTimeSeriesStats";
import { toggleTool } from "./toggleTool";

export const FindServersOutput = z.array(
  UserMcpServerInstanceSchema.merge(
    z.object({
      id: UserMcpServerInstanceIdSchema,
      apiKeys: McpApiKeySchema.array(),
      tools: z.array(z.object({})), // ツール数のみ必要なので空オブジェクトの配列
      toolGroups: z.array(z.never()).optional(), // 使用しないので削除
      userMcpServers: z.array(z.never()).optional(), // 使用しないので削除
      mcpServer: McpServerSchema.pick({
        id: true,
        name: true,
        iconPath: true,
        url: true,
      }).nullable(), // mcpServerデータを追加
    }),
  ),
);

export const AddCustomServerInput = z.object({
  name: z.string(),
  description: z.string().default(""),
  serverToolIdsMap: z.record(
    UserMcpServerConfigIdSchema,
    z.array(ToolIdSchema),
  ),
});

export const AddOfficialServerInput = z.object({
  mcpServerId: z.string(),
  envVars: z.record(z.string(), z.string()),
});

export const DeleteServerInstanceInput = z.object({
  id: UserMcpServerInstanceIdSchema,
});

export const UpdateServerInstanceInput = z.object({
  toolGroupId: UserToolGroupIdSchema,
  name: z.string(),
  description: z.string().default(""),
  serverToolIdsMap: z.record(
    UserMcpServerConfigIdSchema,
    z.array(ToolIdSchema),
  ),
});

export const UpdateServerInstanceNameInput = z.object({
  id: UserMcpServerInstanceIdSchema,
  name: z.string(),
});

export const UpdateServerStatusInput = UserMcpServerInstanceSchema.pick({
  serverStatus: true,
}).merge(
  z.object({
    id: UserMcpServerInstanceIdSchema,
  }),
);

// リクエストログ関連のInput schemas
export const FindRequestLogsInput = z.object({
  instanceId: z.string(),
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
});

export const GetRequestStatsInput = z.object({
  instanceId: z.string(),
  period: z.enum(["1day", "7days", "30days", "90days"]).default("7days"),
});

export const GetToolStatsInput = z.object({
  instanceId: z.string(),
  period: z.enum(["1day", "7days", "30days", "90days"]).default("7days"),
});

export const GetTimeSeriesStatsInput = z.object({
  instanceId: z.string(),
  period: z.enum(["24hours", "7days", "30days"]).default("24hours"),
});

// Output schemas for request logs
export const RequestLogOutput = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  mcpServerInstanceId: z.string(),
  toolName: z.string(),
  transportType: z.enum(["STDIO", "SSE", "STREAMABLE_HTTPS"]),
  method: z.string(),
  responseStatus: z.string(),
  durationMs: z.number(),
  errorMessage: z.string().nullable(),
  errorCode: z.string().nullable(),
  inputBytes: z.number().nullable(),
  outputBytes: z.number().nullable(),
  organizationId: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
});

export const ToolStatsOutput = z.array(
  z.object({
    toolName: z.string(),
    count: z.number(),
    avgDuration: z.number(),
    errorCount: z.number(),
    errorRate: z.number(),
  }),
);

export const TimeSeriesStatsOutput = z.array(
  z.object({
    time: z.string(),
    requests: z.number(),
    errors: z.number(),
    avgDuration: z.number(),
  }),
);

export const ToggleToolInput = z.object({
  instanceId: UserMcpServerInstanceIdSchema,
  toolId: ToolIdSchema,
  userMcpServerConfigId: UserMcpServerConfigIdSchema,
  enabled: z.boolean(),
});

export const userMcpServerInstanceRouter = createTRPCRouter({
  findCustomServers: protectedProcedure
    .output(FindServersOutput)
    .query(findCustomServers),
  findOfficialServers: protectedProcedure
    .output(FindServersOutput)
    .query(findOfficialServers),
  addCustomServer: protectedProcedure
    .input(AddCustomServerInput)
    .output(z.object({}))
    .mutation(addCustomServer),
  addOfficialServer: protectedProcedure
    .input(AddOfficialServerInput)
    .output(z.object({}))
    .mutation(addOfficialServer),
  delete: protectedProcedure
    .input(DeleteServerInstanceInput)
    .output(z.object({}))
    .mutation(deleteServerInstance),
  update: protectedProcedure
    .input(UpdateServerInstanceInput)
    .output(z.object({}))
    .mutation(updateServerInstance),
  updateName: protectedProcedure
    .input(UpdateServerInstanceNameInput)
    .output(z.object({}))
    .mutation(updateServerInstanceName),
  updateServerStatus: protectedProcedure
    .input(UpdateServerStatusInput)
    .output(z.object({}))
    .mutation(updateServerStatus),
  findById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(findById),

  // リクエストログ関連のエンドポイント
  findRequestLogs: protectedProcedure
    .input(FindRequestLogsInput)
    .query(findRequestLogs),

  getRequestStats: protectedProcedure
    .input(GetRequestStatsInput)
    .query(getRequestStats),

  getToolStats: protectedProcedure.input(GetToolStatsInput).query(getToolStats),

  getTimeSeriesStats: protectedProcedure
    .input(GetTimeSeriesStatsInput)
    .query(getTimeSeriesStats),

  toggleTool: protectedProcedure.input(ToggleToolInput).mutation(toggleTool),
});
