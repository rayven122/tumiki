import http from "node:http";
import * as service from "./ai-coding-telemetry.service";
import * as logger from "../../shared/utils/logger";

// OTLP HTTP のデフォルトポート
export const OTLP_DEFAULT_PORT = 4318;

// 指定ポートでリッスンを試みる。失敗（EADDRINUSE）時は reject する
const tryListen = (server: http.Server, port: number): Promise<number> =>
  new Promise<number>((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException): void => {
      server.removeListener("listening", onListening);
      reject(err);
    };
    const onListening = (): void => {
      server.removeListener("error", onError);
      const addr = server.address() as { port: number };
      resolve(addr.port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });

/**
 * OTLP/HTTP レシーバーを起動する。
 *
 * preferredPort（前回起動ポートまたはデフォルト）でのバインドを優先する。
 * そのポートが競合している場合はポート 0（OS 割り当て）にフォールバックする。
 * 呼び出し元は返却された port を electron-store に永続化し、次回起動時に渡すこと。
 */
export const startOtlpReceiver = async (
  preferredPort: number = OTLP_DEFAULT_PORT,
): Promise<{ server: http.Server; port: number }> => {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: unknown) => {
      body += String(chunk);
    });
    req.on("end", () => {
      void (async () => {
        try {
          const data: unknown = JSON.parse(body);
          if (req.url === "/v1/metrics") await service.storeOtlpMetrics(data);
          if (req.url === "/v1/traces") await service.storeOtlpTraces(data);
        } catch (error) {
          logger.warn("OTLP receiver: リクエスト処理中にエラーが発生しました", {
            url: req.url,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end("{}");
      })();
    });
  });

  // preferredPort を優先。競合時は OS 割り当てにフォールバック
  let port: number;
  try {
    port = await tryListen(server, preferredPort);
    logger.info("OTLP receiver を起動しました", { port });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EADDRINUSE") {
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
