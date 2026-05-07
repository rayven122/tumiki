import { BrowserWindow, ipcMain } from "electron";
import { z } from "zod";
import type { McpOAuthManager } from "./oauth.service";
import { DiscoveryError, DISCOVERY_ERROR_CODE } from "./oauth.discovery";
import { LOOPBACK_PORT_IN_USE } from "./oauth.loopback";
import * as logger from "../../shared/utils/logger";

/** IPC入力のバリデーションスキーマ */
const StartOAuthInputSchema = z.object({
  catalogName: z.string().min(1),
  description: z.string(),
  transportType: z.enum(["STDIO", "SSE", "STREAMABLE_HTTP"]),
  command: z.string().nullable(),
  args: z.string(),
  url: z.url(),
  managerCatalog: z
    .object({
      catalogId: z.string().min(1),
      status: z.enum(["available", "request_required", "disabled"]),
      permissions: z.object({
        read: z.boolean(),
        write: z.boolean(),
        execute: z.boolean(),
      }),
      connectionTemplate: z.object({
        transportType: z.enum(["STDIO", "SSE", "STREAMABLE_HTTP"]),
        command: z.string().nullable(),
        args: z.array(z.string()),
        url: z.string().nullable(),
        authType: z.enum(["NONE", "BEARER", "API_KEY", "OAUTH"]),
        credentialKeys: z.array(z.string()),
      }),
      tools: z.array(
        z.object({
          name: z.string().min(1),
          allowed: z.boolean(),
        }),
      ),
    })
    .optional(),
  oauthClientId: z.string().min(1).optional(),
  oauthClientSecret: z.string().min(1).optional(),
});

/** Errorに `code` プロパティが付与されている場合に取り出す */
const errorCodeOf = (error: unknown): string | null => {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
};

/**
 * OAuthエラーをユーザー向けメッセージとエラーコードのペアに変換
 */
const resolveOAuthErrorInfo = (
  error: unknown,
): { code: string; message: string } => {
  if (error instanceof DiscoveryError) {
    switch (error.code) {
      case DISCOVERY_ERROR_CODE.DCR_NOT_SUPPORTED:
        return {
          code: error.code,
          message:
            "このサーバーはOAuth自動登録に対応していません。手動でクライアントIDを設定してください。",
        };
      case DISCOVERY_ERROR_CODE.DCR_REGISTRATION_FAILED:
        return {
          code: error.code,
          message: `OAuth クライアント登録が拒否されました（${error.statusCode ?? "不明"}）。サーバーの設定を確認してください。`,
        };
      case DISCOVERY_ERROR_CODE.ISSUER_VALIDATION_ERROR:
        return {
          code: error.code,
          message:
            "認可サーバーの検証に失敗しました。セキュリティ上の理由により接続できません。",
        };
      case DISCOVERY_ERROR_CODE.DISCOVERY_ERROR:
      case DISCOVERY_ERROR_CODE.AS_DISCOVERY_ERROR:
        return {
          code: error.code,
          message:
            "OAuthサーバーの情報を取得できませんでした。サーバーURLを確認してください。",
        };
      default:
        return { code: error.code, message: error.message };
    }
  }

  // ループバックポート占有
  if (errorCodeOf(error) === LOOPBACK_PORT_IN_USE) {
    return {
      code: LOOPBACK_PORT_IN_USE,
      message:
        error instanceof Error
          ? error.message
          : "OAuthコールバック用ポートが使用中です。",
    };
  }

  if (error instanceof Error) {
    return { code: "UNKNOWN", message: error.message };
  }
  return { code: "UNKNOWN", message: "OAuth認証の開始に失敗しました" };
};

const broadcastToWindows = (channel: string, ...args: unknown[]): void => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  }
};

/**
 * MCP OAuth関連の IPC ハンドラーを設定
 */
export const setupOAuthIpc = (manager: McpOAuthManager): void => {
  // OAuth認証フロー開始（ループバック起動 → ブラウザオープン → コールバック受信 → トークン交換まで一括）
  ipcMain.handle("oauth:startAuth", async (_, input: unknown) => {
    let parsed: z.infer<typeof StartOAuthInputSchema>;
    try {
      parsed = StartOAuthInputSchema.parse(input);
    } catch (error) {
      logger.error(
        "Invalid OAuth IPC input",
        error instanceof Error ? error : { error },
      );
      throw new Error("[UNKNOWN] OAuth入力の検証に失敗しました");
    }

    try {
      const result = await manager.startAuthFlow(parsed);
      broadcastToWindows("oauth:success", result);
      return result;
    } catch (error) {
      logger.error(
        "Failed to complete MCP OAuth flow",
        error instanceof Error ? error : { error },
      );

      const { code, message } = resolveOAuthErrorInfo(error);
      const wrapped = `[${code}] ${message}`;

      // DCR非対応はrenderer側でフォーム表示に分岐するためエラーイベントは送らない
      if (code !== DISCOVERY_ERROR_CODE.DCR_NOT_SUPPORTED) {
        broadcastToWindows("oauth:error", wrapped);
      }

      throw new Error(wrapped);
    }
  });

  // OAuth認証フローキャンセル
  ipcMain.handle("oauth:cancelAuth", () => {
    manager.cancelAuthFlow();
  });

  // 手動入力済みOAuthクライアントの検索
  ipcMain.handle(
    "oauth:findManualOAuthClient",
    async (_, serverUrl: unknown) => {
      try {
        const parsed = z.string().url().parse(serverUrl);
        return await manager.findManualOAuthClient(parsed);
      } catch (error) {
        logger.error(
          "Failed to find manual OAuth client",
          error instanceof Error ? error : { error },
        );
        throw new Error("手動入力済みOAuthクライアントの検索に失敗しました");
      }
    },
  );
};
