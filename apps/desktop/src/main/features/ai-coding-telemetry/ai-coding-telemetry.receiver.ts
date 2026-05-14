import http from "node:http";
import * as service from "./ai-coding-telemetry.service";
import * as logger from "../../shared/utils/logger";

// OTLP HTTP のデフォルトポート
export const OTLP_DEFAULT_PORT = 4318;

// ボディサイズ上限（10MB）— OTLPペイロードがこれを超えることはほぼないが念のため
const MAX_BODY_BYTES = 10 * 1024 * 1024;

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

// preferredPort を優先してバインド。競合時は OS 割り当てにフォールバック。返却ポートを electron-store に保存すること
export const startOtlpReceiver = async (
  preferredPort: number = OTLP_DEFAULT_PORT,
): Promise<{ server: http.Server; port: number }> => {
  const server = http.createServer((req, res) => {
    // POST 以外は即 405 を返す
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end("{}");
      return;
    }

    const chunks: Buffer[] = [];
    let bodySize = 0;
    // ボディ超過フラグ — end ハンドラで二重レスポンスを防ぐ
    let bodyExceeded = false;

    req.on("data", (chunk: Buffer) => {
      if (bodyExceeded) return;
      // Buffer.length はバイト数なので MAX_BODY_BYTES と正確に比較できる
      bodySize += chunk.length;
      // ボディサイズ上限を超えたら 413 を返し、残りのリクエストボディを読み捨てる
      if (bodySize > MAX_BODY_BYTES) {
        bodyExceeded = true;
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end("{}");
        req.resume();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      // ボディ超過で既にレスポンス送信済みの場合は何もしない
      if (bodyExceeded) return;
      void (async () => {
        try {
          const body = Buffer.concat(chunks).toString("utf-8");
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
