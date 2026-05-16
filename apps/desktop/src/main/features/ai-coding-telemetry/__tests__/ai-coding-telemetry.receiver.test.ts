import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import http from "node:http";

vi.mock("../../../shared/utils/logger", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../ai-coding-telemetry.service", () => ({
  storeOtlpMetrics: vi.fn().mockResolvedValue(undefined),
  storeOtlpTraces: vi.fn().mockResolvedValue(undefined),
}));

import {
  startOtlpReceiver,
  OTLP_DEFAULT_PORT,
} from "../ai-coding-telemetry.receiver";
import * as service from "../ai-coding-telemetry.service";

// HTTP リクエストのヘルパー
const sendRequest = (
  port: number,
  path: string,
  body: string,
  method = "POST",
  headers?: http.OutgoingHttpHeaders,
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path, method, headers },
      (res) => {
        let data = "";
        res.on("data", (chunk: unknown) => {
          data += String(chunk);
        });
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: data }),
        );
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });

let testServer: http.Server | null = null;
let testPort = 0;

beforeEach(async () => {
  vi.clearAllMocks();
  const result = await startOtlpReceiver(0); // 0 で OS 割り当て
  testServer = result.server;
  testPort = result.port;
});

afterEach(() => {
  if (testServer) {
    testServer.close();
    testServer = null;
  }
});

describe("startOtlpReceiver", () => {
  test("サーバーが起動してポートが返される", () => {
    expect(testPort).toBeGreaterThan(0);
    expect(testServer).toBeDefined();
  });

  test("OTLP_DEFAULT_PORT は 4318 である", () => {
    expect(OTLP_DEFAULT_PORT).toStrictEqual(4318);
  });
});

describe("HTTP メソッドの検証", () => {
  test("POST リクエストは 200 を返す", async () => {
    const res = await sendRequest(testPort, "/v1/metrics", "{}");
    expect(res.status).toStrictEqual(200);
  });

  test("GET リクエストは 405 を返す", async () => {
    const res = await sendRequest(testPort, "/v1/metrics", "", "GET");
    expect(res.status).toStrictEqual(405);
    expect(service.storeOtlpMetrics).not.toHaveBeenCalled();
  });

  test("PUT リクエストは 405 を返す", async () => {
    const res = await sendRequest(testPort, "/v1/metrics", "{}", "PUT");
    expect(res.status).toStrictEqual(405);
  });
});

describe("Host ヘッダーの検証", () => {
  test("Host が偽装されてもローカルソケットからの接続は処理する", async () => {
    const res = await sendRequest(testPort, "/v1/metrics", "{}", "POST", {
      Host: "example.com",
    });

    expect(res.status).toStrictEqual(200);
    expect(res.body).toStrictEqual("{}");
    expect(service.storeOtlpMetrics).toHaveBeenCalledOnce();
    expect(service.storeOtlpTraces).not.toHaveBeenCalled();
  });
});

describe("エンドポイントルーティング", () => {
  test("/v1/metrics は storeOtlpMetrics を呼び出す", async () => {
    const payload = JSON.stringify({ resourceMetrics: [] });
    await sendRequest(testPort, "/v1/metrics", payload);
    expect(service.storeOtlpMetrics).toHaveBeenCalledOnce();
    expect(service.storeOtlpTraces).not.toHaveBeenCalled();
  });

  test("/v1/metrics はクエリ文字列付きでも storeOtlpMetrics を呼び出す", async () => {
    const payload = JSON.stringify({ resourceMetrics: [] });
    const res = await sendRequest(testPort, "/v1/metrics?timeout=10", payload);
    expect(res.status).toStrictEqual(200);
    expect(service.storeOtlpMetrics).toHaveBeenCalledOnce();
    expect(service.storeOtlpTraces).not.toHaveBeenCalled();
  });

  test("/v1/traces は storeOtlpTraces を呼び出す", async () => {
    const payload = JSON.stringify({ resourceSpans: [] });
    await sendRequest(testPort, "/v1/traces", payload);
    expect(service.storeOtlpTraces).toHaveBeenCalledOnce();
    expect(service.storeOtlpMetrics).not.toHaveBeenCalled();
  });

  test("保存処理が失敗した場合は 500 を返す", async () => {
    vi.mocked(service.storeOtlpMetrics).mockRejectedValueOnce(
      new Error("DB locked"),
    );
    const payload = JSON.stringify({ resourceMetrics: [] });

    const res = await sendRequest(testPort, "/v1/metrics", payload);

    expect(res.status).toStrictEqual(500);
    expect(res.body).toStrictEqual("{}");
  });

  test("未知のパスは 404 を返してサービスを呼ばない", async () => {
    const res = await sendRequest(testPort, "/unknown", "{}");
    expect(res.status).toStrictEqual(404);
    expect(service.storeOtlpMetrics).not.toHaveBeenCalled();
    expect(service.storeOtlpTraces).not.toHaveBeenCalled();
  });
});

describe("ボディサイズ制限", () => {
  test("10MB 以下のボディは正常に処理される", async () => {
    const smallBody = JSON.stringify({ resourceMetrics: [] });
    const res = await sendRequest(testPort, "/v1/metrics", smallBody);
    expect(res.status).toStrictEqual(200);
  });

  test("10MB を超えるボディは 413 を返す", async () => {
    const largeBody = "x".repeat(10 * 1024 * 1024 + 1);
    const res = await sendRequest(testPort, "/v1/metrics", largeBody);
    expect(res.status).toStrictEqual(413);
    expect(res.body).toStrictEqual("{}");
    expect(service.storeOtlpMetrics).not.toHaveBeenCalled();
  });

  test("JSON パース失敗時はエラーログを出力して 400 を返す", async () => {
    const res = await sendRequest(testPort, "/v1/metrics", "invalid json");
    expect(res.status).toStrictEqual(400);
    // エラーが発生してもサービスを呼び出さない
    expect(service.storeOtlpMetrics).not.toHaveBeenCalled();
  });
});

describe("レスポンス形式", () => {
  test("レスポンスボディは {} である", async () => {
    const res = await sendRequest(testPort, "/v1/metrics", "{}");
    expect(res.body).toStrictEqual("{}");
  });

  test("エラー時のレスポンスボディも {} である", async () => {
    const res = await sendRequest(testPort, "/v1/metrics", "invalid json");
    expect(res.body).toStrictEqual("{}");
  });
});

describe("ポートフォールバック", () => {
  test("preferredPort が使用中でも OS 割り当てポートで起動する", async () => {
    // 既に testPort が使用中
    const result2 = await startOtlpReceiver(testPort);
    try {
      expect(result2.port).toBeGreaterThan(0);
      // フォールバックして別のポートが割り当てられる
      expect(result2.port).not.toStrictEqual(testPort);
    } finally {
      result2.server.close();
    }
  });

  test("fallback 無効時に preferredPort が使用中なら起動に失敗する", async () => {
    await expect(
      startOtlpReceiver(testPort, { allowFallback: false }),
    ).rejects.toMatchObject({ code: "EADDRINUSE" });
  });
});
