import http from "node:http";
import * as service from "./ai-coding-telemetry.service";
import * as logger from "../../shared/utils/logger";

// OTLP/HTTP レシーバーを起動してランダムポートで待ち受ける
export const startOtlpReceiver = (): Promise<{
  server: http.Server;
  port: number;
}> => {
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

  // ポート 0 でリッスンすると OS がランダムポートを割り当てる
  // listen は非同期なので、listening イベントを待ってポートを取得する
  return new Promise<{ server: http.Server; port: number }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      const port = addr.port;
      logger.info("OTLP receiver を起動しました", { port });
      resolve({ server, port });
    });
  });
};
