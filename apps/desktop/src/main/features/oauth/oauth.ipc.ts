import { ipcMain } from "electron";
import { z } from "zod";
import type { McpOAuthManager } from "./oauth.service";
import { DiscoveryError, DISCOVERY_ERROR_CODE } from "./oauth.discovery";
import * as logger from "../../shared/utils/logger";

/** IPC入力のバリデーションスキーマ */
const StartOAuthInputSchema = z.object({
  catalogId: z.number().int().positive().optional(),
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

/**
 * OAuthエラーをユーザー向けメッセージに変換
 */
const getOAuthErrorMessage = (error: unknown): string => {
  if (error instanceof DiscoveryError) {
    switch (error.code) {
      case DISCOVERY_ERROR_CODE.DCR_NOT_SUPPORTED:
        return "このサーバーはOAuth自動登録に対応していません。手動でクライアントIDを設定してください。";
      case DISCOVERY_ERROR_CODE.DCR_REGISTRATION_FAILED:
        return `OAuth クライアント登録が拒否されました（${error.statusCode ?? "不明"}）。サーバーの設定を確認してください。`;
      case DISCOVERY_ERROR_CODE.ISSUER_VALIDATION_ERROR:
        return "認可サーバーの検証に失敗しました。セキュリティ上の理由により接続できません。";
      case DISCOVERY_ERROR_CODE.DISCOVERY_ERROR:
      case DISCOVERY_ERROR_CODE.AS_DISCOVERY_ERROR:
        return "OAuthサーバーの情報を取得できませんでした。サーバーURLを確認してください。";
      default:
        return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "OAuth認証の開始に失敗しました";
};

/**
 * MCP OAuth関連の IPC ハンドラーを設定
 */
export const setupOAuthIpc = (manager: McpOAuthManager): void => {
  // OAuth認証フロー開始（ブラウザを開く）
  ipcMain.handle("oauth:startAuth", async (_, input: unknown) => {
    try {
      const parsed = StartOAuthInputSchema.parse(input);
      await manager.startAuthFlow(parsed);
    } catch (error) {
      logger.error(
        "Failed to start MCP OAuth flow",
        error instanceof Error ? error : { error },
      );

      // ユーザー向けエラーメッセージを生成
      // ElectronのIPCはカスタムプロパティをシリアライズしないため、
      // エラーコードをメッセージに埋め込んでrenderer側で抽出する
      const userMessage = getOAuthErrorMessage(error);
      const code = error instanceof DiscoveryError ? error.code : "UNKNOWN";
      throw new Error(`[${code}] ${userMessage}`);
    }
  });

  // OAuth認証フローキャンセル
  ipcMain.handle("oauth:cancelAuth", () => {
    manager.cancelAuthFlow();
  });

  // 手動入力済みOAuthクライアントの検索
  ipcMain.handle(
    "oauth:findManualOAuthClient",
    async (_, serverUrl: string) => {
      return manager.findManualOAuthClient(serverUrl);
    },
  );
};
