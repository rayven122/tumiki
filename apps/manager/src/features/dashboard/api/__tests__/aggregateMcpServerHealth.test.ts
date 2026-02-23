import { describe, test, expect } from "vitest";
import { aggregateMcpServerHealth } from "../aggregateMcpServerHealth";

const createServer = (
  id: string,
  name: string,
  slug: string,
  serverStatus: "RUNNING" | "STOPPED" | "ERROR" | "PENDING" = "RUNNING",
  iconPath: string | null = null,
  templateInstances: {
    mcpServerTemplate: { iconPath: string | null } | null;
  }[] = [],
) => ({
  id,
  name,
  slug,
  iconPath,
  serverStatus,
  templateInstances,
});

const createLog = (
  mcpServerId: string,
  httpStatus: number,
  durationMs: number,
) => ({
  mcpServerId,
  httpStatus,
  durationMs,
});

describe("aggregateMcpServerHealth", () => {
  test("リクエストログのないサーバーはrequestCount=0, errorCount=0, errorRate=0, avgDurationMs=null", () => {
    const servers = [createServer("s1", "Server1", "server-1")];
    const result = aggregateMcpServerHealth(servers, []);

    expect(result).toStrictEqual([
      {
        mcpServerId: "s1",
        name: "Server1",
        slug: "server-1",
        iconPath: null,
        serverStatus: "RUNNING",
        requestCount: 0,
        errorCount: 0,
        errorRate: 0,
        avgDurationMs: null,
      },
    ]);
  });

  test("エラー率の計算が正しい（httpStatus >= 400 がエラー）", () => {
    const servers = [createServer("s1", "Server1", "server-1")];
    const logs = [
      createLog("s1", 200, 100),
      createLog("s1", 200, 150),
      createLog("s1", 400, 200),
      createLog("s1", 500, 300),
      createLog("s1", 502, 250),
    ];

    const result = aggregateMcpServerHealth(servers, logs);

    expect(result[0]?.requestCount).toBe(5);
    expect(result[0]?.errorCount).toBe(3);
    // 3/5 = 60.0%
    expect(result[0]?.errorRate).toBe(60);
  });

  test("エラー率は小数点1桁で丸められる", () => {
    const servers = [createServer("s1", "Server1", "server-1")];
    // 1/3 = 33.333...% → 33.3
    const logs = [
      createLog("s1", 200, 100),
      createLog("s1", 200, 100),
      createLog("s1", 500, 100),
    ];

    const result = aggregateMcpServerHealth(servers, logs);

    expect(result[0]?.errorRate).toBe(33.3);
  });

  test("平均実行時間の計算が正しい", () => {
    const servers = [createServer("s1", "Server1", "server-1")];
    const logs = [
      createLog("s1", 200, 100),
      createLog("s1", 200, 200),
      createLog("s1", 200, 300),
    ];

    const result = aggregateMcpServerHealth(servers, logs);

    // (100 + 200 + 300) / 3 = 200
    expect(result[0]?.avgDurationMs).toBe(200);
  });

  test("平均実行時間は整数に丸められる", () => {
    const servers = [createServer("s1", "Server1", "server-1")];
    const logs = [createLog("s1", 200, 100), createLog("s1", 200, 200)];

    const result = aggregateMcpServerHealth(servers, logs);

    // (100 + 200) / 2 = 150
    expect(result[0]?.avgDurationMs).toBe(150);
  });

  test("複数サーバーの集計が独立して行われる", () => {
    const servers = [
      createServer("s1", "Server1", "server-1", "RUNNING", "lucide:server"),
      createServer("s2", "Server2", "server-2", "STOPPED"),
    ];
    const logs = [
      createLog("s1", 200, 100),
      createLog("s1", 200, 200),
      createLog("s2", 500, 300),
    ];

    const result = aggregateMcpServerHealth(servers, logs);

    // Server1: 2リクエスト、エラーなし
    expect(result[0]?.mcpServerId).toBe("s1");
    expect(result[0]?.iconPath).toBe("lucide:server");
    expect(result[0]?.serverStatus).toBe("RUNNING");
    expect(result[0]?.requestCount).toBe(2);
    expect(result[0]?.errorCount).toBe(0);
    expect(result[0]?.errorRate).toBe(0);
    expect(result[0]?.avgDurationMs).toBe(150);

    // Server2: 1リクエスト、全てエラー
    expect(result[1]?.mcpServerId).toBe("s2");
    expect(result[1]?.iconPath).toBeNull();
    expect(result[1]?.serverStatus).toBe("STOPPED");
    expect(result[1]?.requestCount).toBe(1);
    expect(result[1]?.errorCount).toBe(1);
    expect(result[1]?.errorRate).toBe(100);
    expect(result[1]?.avgDurationMs).toBe(300);
  });

  test("テンプレートインスタンスからアイコンがフォールバックされる", () => {
    const servers = [
      createServer("s1", "Server1", "server-1", "RUNNING", null, [
        { mcpServerTemplate: { iconPath: "template-icon.png" } },
      ]),
    ];

    const result = aggregateMcpServerHealth(servers, []);

    expect(result[0]?.iconPath).toBe("template-icon.png");
  });

  test("サーバー直接指定のアイコンがテンプレートより優先される", () => {
    const servers = [
      createServer("s1", "Server1", "server-1", "RUNNING", "direct-icon.png", [
        { mcpServerTemplate: { iconPath: "template-icon.png" } },
      ]),
    ];

    const result = aggregateMcpServerHealth(servers, []);

    expect(result[0]?.iconPath).toBe("direct-icon.png");
  });

  test("テンプレートインスタンスのmcpServerTemplateがnullの場合はアイコンがnull", () => {
    const servers = [
      createServer("s1", "Server1", "server-1", "RUNNING", null, [
        { mcpServerTemplate: null },
      ]),
    ];

    const result = aggregateMcpServerHealth(servers, []);

    expect(result[0]?.iconPath).toBeNull();
  });

  test("サーバーに紐づかないログは無視される", () => {
    const servers = [createServer("s1", "Server1", "server-1")];
    const logs = [createLog("s1", 200, 100), createLog("unknown", 200, 200)];

    const result = aggregateMcpServerHealth(servers, logs);

    expect(result).toHaveLength(1);
    expect(result[0]?.requestCount).toBe(1);
  });

  test("httpStatus 399以下はエラーに含まれない", () => {
    const servers = [createServer("s1", "Server1", "server-1")];
    const logs = [
      createLog("s1", 200, 100),
      createLog("s1", 301, 100),
      createLog("s1", 399, 100),
    ];

    const result = aggregateMcpServerHealth(servers, logs);

    expect(result[0]?.errorCount).toBe(0);
    expect(result[0]?.errorRate).toBe(0);
  });
});
