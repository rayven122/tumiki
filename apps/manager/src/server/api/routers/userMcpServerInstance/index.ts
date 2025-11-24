import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { addCustomServer } from "./addCustomServer";
import {
  McpServerIdSchema,
  McpToolIdSchema,
  McpConfigIdSchema,
} from "@/schema/ids";
import { nameValidationSchema } from "@/schema/validation";
import { findCustomServers } from "./findCustomServers";

import {
  McpApiKeySchema,
  McpServerTemplateSchema,
  McpServerSchema,
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
import { checkServerConnection } from "./checkServerConnection";
import {
  getRequestDataDetail,
  GetRequestDataDetailInput,
  GetRequestDataDetailOutput,
} from "./getRequestDataDetail";
import { ServerStatus } from "@tumiki/db/server";
import {
  updateDisplayOrder,
  updateDisplayOrderSchema,
} from "./updateDisplayOrder";

/**
 * 新スキーマ：McpServer（旧UserMcpServerInstance）の出力型
 * - toolGroups削除、allowedToolsに変更
 * - mcpServer → mcpServerTemplates（多対多）
 */
export const FindServersOutput = z.array(
  McpServerSchema.merge(
    z.object({
      id: McpServerIdSchema,
      apiKeys: McpApiKeySchema.array(),
      allowedTools: z.array(z.object({})), // ツール数のみ必要なので空オブジェクトの配列
      mcpServerTemplates: z.array(
        McpServerTemplateSchema.pick({
          id: true,
          name: true,
          description: true,
          tags: true,
          iconPath: true,
          url: true,
        }),
      ), // 多対多リレーション
    }),
  ),
);

/**
 * 新スキーマ：カスタムサーバー追加入力
 * - serverToolIdsMap削除（ツールグループ廃止）
 * - mcpConfigId + allowedToolIds に変更
 */
export const AddCustomServerInput = z.object({
  name: nameValidationSchema,
  description: z.string().default(""),
  mcpConfigId: McpConfigIdSchema,
  allowedToolIds: z.array(McpToolIdSchema),
});

/**
 * 新スキーマ：公式サーバー追加入力
 * - mcpServerId → mcpServerTemplateId
 */
export const AddOfficialServerInput = z.object({
  mcpServerTemplateId: z.string(),
  envVars: z.record(z.string(), z.string()),
  isPending: z.boolean().optional(), // OAuth認証用フラグを追加
  name: nameValidationSchema, // サーバー名を必須に変更
  description: z.string().optional(),
});

/**
 * 新スキーマ：公式サーバー追加出力
 * - toolGroupId削除
 */
export const AddOfficialServerOutput = z.object({
  id: z.string(),
  mcpConfigId: z.string(),
  skipValidation: z.boolean().optional(),
});

/**
 * 新スキーマ：サーバーインスタンス削除入力
 * - UserMcpServerInstanceIdSchema → McpServerIdSchema
 */
export const DeleteServerInstanceInput = z.object({
  id: McpServerIdSchema,
});

/**
 * 新スキーマ：サーバーインスタンス更新入力
 * - toolGroupId削除
 * - serverToolIdsMap → allowedToolIds
 */
export const UpdateServerInstanceInput = z.object({
  id: McpServerIdSchema,
  name: z.string(),
  description: z.string().default(""),
  allowedToolIds: z.array(McpToolIdSchema),
});

/**
 * 新スキーマ：サーバーインスタンス名更新入力
 */
export const UpdateServerInstanceNameInput = z.object({
  id: McpServerIdSchema,
  name: nameValidationSchema,
  description: z.string().optional(),
});

/**
 * 新スキーマ：サーバーステータス更新入力
 */
export const UpdateServerStatusInput = McpServerSchema.pick({
  serverStatus: true,
}).merge(
  z.object({
    id: McpServerIdSchema,
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
  mcpServerId: z.string(),
  toolName: z.string(),
  transportType: z.enum(["STDIO", "SSE", "STREAMABLE_HTTPS"]),
  method: z.string(),
  httpStatus: z.string(),
  durationMs: z.number(),
  inputBytes: z.number(),
  outputBytes: z.number(),
  organizationId: z.string(),
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

/**
 * 新スキーマ：ツールトグル入力
 * - instanceId: McpServerIdSchema
 * - toolId: McpToolIdSchema
 * - userMcpServerConfigId削除（ツールグループ廃止）
 */
export const ToggleToolInput = z.object({
  instanceId: McpServerIdSchema,
  toolId: McpToolIdSchema,
  enabled: z.boolean(),
});

/**
 * 新スキーマ：サーバー接続チェック入力
 */
export const CheckServerConnectionInput = z.object({
  serverInstanceId: McpServerIdSchema,
  updateStatus: z.boolean().optional().default(false),
});

/**
 * 新スキーマ：mcpServerRouter（旧userMcpServerInstanceRouter）
 * - テーブル: UserMcpServerInstance → McpServer
 * - ツールグループ削除、多対多リレーションに変更
 */
export const userMcpServerInstanceRouter = createTRPCRouter({
  findCustomServers: protectedProcedure
    .output(FindServersOutput)
    .query(findCustomServers),
  findOfficialServers: protectedProcedure
    .output(FindServersOutput)
    .query(findOfficialServers),
  addCustomServer: protectedProcedure
    .input(AddCustomServerInput)
    .output(
      z.object({
        id: McpServerIdSchema,
      }),
    )
    .mutation(addCustomServer),
  addOfficialServer: protectedProcedure
    .input(AddOfficialServerInput)
    .output(AddOfficialServerOutput)
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

  checkServerConnection: protectedProcedure
    .input(CheckServerConnectionInput)
    .output(
      z.object({
        success: z.boolean(),
        status: z.nativeEnum(ServerStatus),
        error: z.string().optional(),
        toolCount: z.number(),
      }),
    )
    .mutation(checkServerConnection),

  updateDisplayOrder: protectedProcedure
    .input(updateDisplayOrderSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(updateDisplayOrder),
  getRequestDataDetail: protectedProcedure
    .input(GetRequestDataDetailInput)
    .output(GetRequestDataDetailOutput)
    .query(getRequestDataDetail),
});
