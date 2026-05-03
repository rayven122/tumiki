import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../shared/manager-api-client", () => ({
  postManagerApi: vi.fn(),
}));
vi.mock("../../../shared/utils/logger", () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

import { syncAuditLogToManager } from "../manager-audit-log-sync.service";
import { postManagerApi } from "../../../shared/manager-api-client";

describe("manager-audit-log-sync.service", () => {
  const input = {
    toolName: "list_repos",
    method: "tools/call" as const,
    transportType: "STDIO" as const,
    durationMs: 342,
    inputBytes: 50,
    outputBytes: 1200,
    isSuccess: true,
    serverId: 3,
    connectionName: "main",
    createdAt: new Date("2026-05-03T10:00:00.000Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(postManagerApi).mockResolvedValue(
      new Response(JSON.stringify({ inserted: 1 }), { status: 200 }),
    );
  });

  test("Manager API clientがスキップした場合はfalseを返す", async () => {
    vi.mocked(postManagerApi).mockResolvedValue(null);

    const result = await syncAuditLogToManager(input);

    expect(result).toBe(false);
  });

  test("internal-managerへ監査ログpayloadをPOSTする", async () => {
    const result = await syncAuditLogToManager(input);

    expect(result).toBe(true);
    expect(postManagerApi).toHaveBeenCalledWith(
      "/api/internal/audit-logs",
      {
        logs: [
          {
            mcpServerId: "3",
            toolName: "list_repos",
            method: "tools/call",
            httpStatus: 200,
            durationMs: 342,
            inputBytes: 50,
            outputBytes: 1200,
            errorCode: undefined,
            errorSummary: undefined,
            occurredAt: "2026-05-03T10:00:00.000Z",
          },
        ],
      },
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  test("POSTが失敗した場合はfalseを返す", async () => {
    vi.mocked(postManagerApi).mockResolvedValue(
      new Response("error", { status: 500 }),
    );

    const result = await syncAuditLogToManager(input);

    expect(result).toBe(false);
  });
});
