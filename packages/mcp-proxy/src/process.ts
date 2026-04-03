/**
 * fork() エントリーポイント
 * Electron Main から fork() で起動され、IPC message で通信する
 */
import type { ProxyCore } from "./core.js";
import type { ProxyEvent, ProxyRequest, ProxyResponse } from "./types.js";
import { createProxyCore, HARDCODED_CONFIGS } from "./core.js";
import { stderrLogger as logger } from "./stderr-logger.js";

/**
 * IPCでメッセージを送信（チャネル切断時はログ出力）
 */
const sendToParent = (message: ProxyResponse | ProxyEvent): void => {
  if (process.send) {
    process.send(message);
  } else {
    logger.error("IPCチャネルが切断されています、メッセージを送信できません", {
      type: "type" in message ? message.type : "response",
    });
  }
};

/**
 * リクエストを処理してレスポンスを返す
 */
const handleRequest = async (
  core: ProxyCore,
  request: ProxyRequest,
): Promise<ProxyResponse> => {
  try {
    switch (request.type) {
      case "start": {
        await core.startAll();
        const status = core.getStatus();
        return { id: request.id, ok: true, result: status };
      }
      case "stop": {
        await core.stopAll();
        return { id: request.id, ok: true };
      }
      case "list-tools": {
        const tools = await core.listTools();
        return { id: request.id, ok: true, result: tools };
      }
      case "call-tool": {
        const payload = request.payload as {
          name: string;
          arguments: Record<string, unknown>;
        };
        const result = await core.callTool(payload.name, payload.arguments);
        return { id: request.id, ok: true, result };
      }
      case "status": {
        const status = core.getStatus();
        return { id: request.id, ok: true, result: status };
      }
      default: {
        return {
          id: request.id,
          ok: false,
          error: `不明なリクエストタイプ: ${request.type as string}`,
        };
      }
    }
  } catch (error) {
    return {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : "不明なエラー",
    };
  }
};

/**
 * プロセスのメインループ
 */
const main = async (): Promise<void> => {
  logger.info("Proxy Process を起動しています...");

  const core = createProxyCore(HARDCODED_CONFIGS, logger);

  // 状態変更をMainに通知
  core.onStatusChange((name, status, error) => {
    const event: ProxyEvent = {
      type: "status-changed",
      payload: { name, status, error },
    };
    sendToParent(event);
  });

  // Mainからのリクエストを受信
  process.on("message", (msg: unknown) => {
    if (
      typeof msg !== "object" ||
      msg === null ||
      !("id" in msg) ||
      !("type" in msg)
    ) {
      logger.warn("不正なリクエストを受信しました", { msg });
      return;
    }
    const request = msg as ProxyRequest;
    void handleRequest(core, request)
      .then((response) => {
        sendToParent(response);
      })
      .catch((error) => {
        logger.error("リクエスト処理中に予期しないエラー", {
          id: request.id,
          error: error instanceof Error ? error.message : String(error),
        });
        // リクエスト元にエラーレスポンスを返す試行
        sendToParent({
          id: request.id,
          ok: false,
          error: "内部エラーが発生しました",
        });
      });
  });

  logger.info("Proxy Process の起動が完了しました（リクエスト待機中）");
};

void main().catch((error) => {
  logger.error("Proxy Process の起動に失敗しました", error);
  process.exit(1);
});
