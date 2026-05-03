import { ipcMain } from "electron";
import { z } from "zod";
import * as mcpService from "./mcp.service";
import type {
  CreateFromCatalogInput,
  CreateCustomServerInput,
  CreateVirtualServerInput,
  UpdateServerInput,
  DeleteServerInput,
  ToggleServerInput,
} from "./mcp.types";
import * as logger from "../../shared/utils/logger";
import { VIRTUAL_SERVER_MAX_CONNECTIONS } from "../../../shared/mcp.constants";

// IPC入力のバリデーションスキーマ
const updateServerSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
}) satisfies z.ZodType<UpdateServerInput>;

const deleteServerSchema = z.object({
  id: z.number().int(),
}) satisfies z.ZodType<DeleteServerInput>;

const toggleServerSchema = z.object({
  id: z.number().int(),
  isEnabled: z.boolean(),
}) satisfies z.ZodType<ToggleServerInput>;

const createFromCatalogSchema = z.object({
  catalogId: z.number().int(),
  catalogName: z.string().min(1),
  description: z.string(),
  transportType: z.enum(["STDIO", "SSE", "STREAMABLE_HTTP"]),
  command: z.string().nullable(),
  args: z.string(),
  url: z.string().nullable(),
  credentialKeys: z.array(z.string()),
  credentials: z.record(z.string(), z.string()),
  authType: z.enum(["NONE", "BEARER", "API_KEY", "OAUTH"]),
}) satisfies z.ZodType<CreateFromCatalogInput>;

const createCustomServerSchema = z
  .object({
    serverName: z.string().min(1),
    transportType: z.enum(["STDIO", "SSE", "STREAMABLE_HTTP"]),
    authType: z.enum(["NONE", "API_KEY", "OAUTH"]),
    credentials: z.record(z.string(), z.string()),
    url: z.string().url({ message: "有効なURLを入力してください" }).optional(),
    command: z.string().min(1).optional(),
    args: z.string().optional(),
  })
  .refine(
    (data) =>
      data.transportType === "STDIO"
        ? Boolean(data.command)
        : Boolean(data.url),
    {
      message:
        "STDIOの場合はコマンド、SSE/Streamable HTTPの場合はURLが必要です",
    },
  ) satisfies z.ZodType<CreateCustomServerInput>;

const createVirtualServerSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  connections: z
    .array(
      z.object({
        catalogId: z.number().int().positive(),
        credentials: z.record(z.string(), z.string()),
      }),
    )
    .min(1)
    .max(VIRTUAL_SERVER_MAX_CONNECTIONS),
}) satisfies z.ZodType<CreateVirtualServerInput>;

/**
 * MCP関連の IPC ハンドラーを設定
 */
export const setupMcpIpc = (): void => {
  // カタログからMCPサーバーを登録
  ipcMain.handle("mcp:createFromCatalog", async (_, input: unknown) => {
    try {
      const validated = createFromCatalogSchema.parse(input);
      return await mcpService.createFromCatalog(validated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to create MCP server from catalog",
        error instanceof Error ? error : { error },
      );
      throw new Error(`MCPサーバーの登録に失敗しました: ${message}`);
    }
  });

  // カスタムURLでリモートMCPサーバーを登録
  ipcMain.handle("mcp:createCustomServer", async (_, input: unknown) => {
    try {
      const validated = createCustomServerSchema.parse(input);
      return await mcpService.createCustomServer(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0];
        const field = firstIssue?.path.join(".") ?? "入力";
        throw new Error(
          `入力内容に問題があります: ${field} - ${firstIssue?.message ?? "不正な値"}`,
        );
      }
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to create custom MCP server",
        error instanceof Error ? error : { error },
      );
      throw new Error(`カスタムMCPサーバーの登録に失敗しました: ${message}`);
    }
  });

  // 仮想MCPサーバーを登録（複数接続を1サーバーに束ねる）
  ipcMain.handle("mcp:createVirtualServer", async (_, input: unknown) => {
    try {
      const validated = createVirtualServerSchema.parse(input);
      return await mcpService.createVirtualServer(validated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to create virtual MCP server",
        error instanceof Error ? error : { error },
      );
      throw new Error(`仮想MCPサーバーの登録に失敗しました: ${message}`);
    }
  });

  // 登録済みMCPサーバー一覧取得
  ipcMain.handle("mcp:getAll", async () => {
    try {
      return await mcpService.getAllServers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to get MCP server list",
        error instanceof Error ? error : { error },
      );
      throw new Error(`MCPサーバー一覧の取得に失敗しました: ${message}`);
    }
  });

  // MCPサーバー情報を更新
  ipcMain.handle("mcp:updateServer", async (_, input: unknown) => {
    try {
      const validated = updateServerSchema.parse(input);
      return await mcpService.updateServer(validated.id, {
        name: validated.name,
        description: validated.description,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to update MCP server",
        error instanceof Error ? error : { error },
      );
      throw new Error(`MCPサーバーの更新に失敗しました: ${message}`);
    }
  });

  // MCPサーバーを削除
  ipcMain.handle("mcp:deleteServer", async (_, input: unknown) => {
    try {
      const validated = deleteServerSchema.parse(input);
      return await mcpService.deleteServer(validated.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to delete MCP server",
        error instanceof Error ? error : { error },
      );
      throw new Error(`MCPサーバーの削除に失敗しました: ${message}`);
    }
  });

  // MCPサーバーのenabled状態を切り替え
  ipcMain.handle("mcp:toggleServer", async (_, input: unknown) => {
    try {
      const validated = toggleServerSchema.parse(input);
      return await mcpService.toggleServer(validated.id, validated.isEnabled);
    } catch (error) {
      const message = error instanceof Error ? error.message : "不明なエラー";
      logger.error(
        "Failed to toggle MCP server",
        error instanceof Error ? error : { error },
      );
      throw new Error(`MCPサーバーの切り替えに失敗しました: ${message}`);
    }
  });
};
