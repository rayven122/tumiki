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
        if (
          !request.payload ||
          typeof request.payload.name !== "string" ||
          typeof request.payload.arguments !== "object" ||
          request.payload.arguments === null
        ) {
          return {
            id: request.id,
            ok: false,
            error: "call-toolリクエストのペイロードが不正です",
          };
        }
        const result = await core.callTool(
          request.payload.name,
          request.payload.arguments,
        );
        return { id: request.id, ok: true, result };
      }
      case "status": {
        const status = core.getStatus();
        return { id: request.id, ok: true, result: status };
      }
      default: {
        // exhaustiveチェック: 新しいリクエストタイプ追加時にコンパイルエラーになる
        const _exhaustive: never = request;
        void _exhaustive;
        return {
          id: "unknown",
          ok: false,
          error: `不明なリクエストタイプ`,
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

  // 既知のリクエストタイプ（satisfiesでProxyRequest["type"]との同期を保証）
  const validTypes = [
    "start",
    "stop",
    "list-tools",
    "call-tool",
    "status",
  ] satisfies ProxyRequest["type"][];
  const VALID_REQUEST_TYPES = new Set<string>(validTypes);

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
    const record = msg as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.type !== "string") {
      logger.warn(
        "不正なリクエスト形式です（id/typeがstring型ではありません）",
        {
          id: typeof record.id,
          type: typeof record.type,
        },
      );
      return;
    }
    if (!VALID_REQUEST_TYPES.has(record.type)) {
      logger.warn("不明なリクエストタイプを受信しました", {
        type: record.type,
      });
      sendToParent({
        id: record.id,
        ok: false,
        error: `不明なリクエストタイプ: ${String(record.type)}`,
      });
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
