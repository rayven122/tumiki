import http from "node:http";
import * as service from "./ai-coding-telemetry.service";
import * as logger from "../../shared/utils/logger";
import { isAddressInUseError } from "../../shared/utils/error";

// OTLP HTTP のデフォルトポート
export const OTLP_DEFAULT_PORT = 4318;

// ボディサイズ上限（10MB）— OTLPペイロードがこれを超えることはほぼないが念のため
const MAX_BODY_BYTES = 10 * 1024 * 1024;

const isLoopbackAddress = (address: string | undefined): boolean =>
  address === "127.0.0.1" ||
  address === "::1" ||
  address === "::ffff:127.0.0.1";

// 指定ポートでリッスンを試みる。失敗（EADDRINUSE）時は reject する
const tryListen = (server: http.Server, port: number): Promise<number> =>
  new Promise<number>((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException): void => {
      server.removeListener("listening", onListening);
      reject(err);
    };
    const onListening = (): void => {
      server.removeListener("error", onError);
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(
          new Error("OTLP receiver: サーバーアドレスの取得に失敗しました"),
        );
        return;
      }
      resolve(addr.port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });

type StartOtlpReceiverOptions = {
  allowFallback?: boolean;
};

// preferredPort を優先してバインド。競合時は必要に応じて OS 割り当てにフォールバックする
export const startOtlpReceiver = async (
  preferredPort: number = OTLP_DEFAULT_PORT,
  options: StartOtlpReceiverOptions = {},
): Promise<{ server: http.Server; port: number }> => {
  const { allowFallback = true } = options;
  const server = http.createServer((req, res) => {
    const sendJsonResponse = (statusCode: number): void => {
      if (res.headersSent || res.writableEnded) return;
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end("{}");
    };

    if (!isLoopbackAddress(req.socket.remoteAddress)) {
      sendJsonResponse(400);
      return;
    }

    // POST 以外は即 405 を返す
    if (req.method !== "POST") {
      sendJsonResponse(405);
      return;
    }

    const chunks: Buffer[] = [];
    let bodySize = 0;
    // ボディ超過フラグ — end ハンドラで二重レスポンスを防ぐ
    let bodyExceeded = false;
    let requestFailed = false;

    req.on("error", (error) => {
      requestFailed = true;
      logger.warn("OTLP receiver: リクエストエラーが発生しました", {
        url: req.url,
        error: error instanceof Error ? error.message : String(error),
      });
      sendJsonResponse(400);
    });

    req.on("data", (chunk: Buffer) => {
      if (bodyExceeded || requestFailed) return;
      // Buffer.length はバイト数なので MAX_BODY_BYTES と正確に比較できる
      bodySize += chunk.length;
      // ボディサイズ上限を超えたら 413 を返し、残りのリクエストボディを読み捨てる
      if (bodySize > MAX_BODY_BYTES) {
        bodyExceeded = true;
        sendJsonResponse(413);
        req.resume();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      // ボディ超過で既にレスポンス送信済みの場合は何もしない
      if (bodyExceeded || requestFailed) return;
      void (async () => {
        const pathname = req.url?.split("?")[0] ?? "";
        if (pathname !== "/v1/metrics" && pathname !== "/v1/traces") {
          sendJsonResponse(404);
          return;
        }
        let data: unknown;
        try {
          const body = Buffer.concat(chunks).toString("utf-8");
          data = JSON.parse(body);
        } catch (error) {
          logger.warn("OTLP receiver: JSON パースエラーが発生しました", {
            url: req.url,
            error: error instanceof Error ? error.message : String(error),
          });
          sendJsonResponse(400);
          return;
        }
        try {
          if (pathname === "/v1/metrics") {
            await service.storeOtlpMetrics(data);
          } else {
            await service.storeOtlpTraces(data);
          }
        } catch (error) {
          logger.error("OTLP receiver: テレメトリ保存に失敗しました", {
            url: req.url,
            error: error instanceof Error ? error.message : String(error),
          });
          sendJsonResponse(500);
          return;
        }
        sendJsonResponse(200);
      })();
    });
  });

  // preferredPort を優先。競合時は OS 割り当てにフォールバック
  let port: number;
  try {
    port = await tryListen(server, preferredPort);
    logger.info("OTLP receiver を起動しました", { port });
  } catch (err) {
    if (isAddressInUseError(err)) {
      if (!allowFallback) {
        throw err;
      }
      logger.warn(
        `OTLP receiver: ポート ${String(preferredPort)} が使用中のため空きポートにフォールバックします`,
      );
      port = await tryListen(server, 0);
      logger.info("OTLP receiver をフォールバックポートで起動しました", {
        port,
      });
    } else {
      throw err;
    }
  }

  return { server, port };
};
