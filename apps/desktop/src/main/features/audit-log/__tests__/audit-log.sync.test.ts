import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../shared/manager-api-client", () => ({
  postManagerJson: vi.fn(),
}));
vi.mock("../../../shared/utils/logger", () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

import { syncAuditLogToManager } from "../audit-log.sync";
import { postManagerJson } from "../../../shared/manager-api-client";

describe("audit-log.sync", () => {
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
    vi.mocked(postManagerJson).mockResolvedValue(
      new Response(JSON.stringify({ inserted: 1 }), { status: 200 }),
    );
  });

  test("Manager API clientがスキップした場合はfalseを返す", async () => {
    vi.mocked(postManagerJson).mockResolvedValue(null);

    const result = await syncAuditLogToManager(input);

    expect(result).toBe(false);
  });

  test("internal-managerへ監査ログpayloadをPOSTする", async () => {
    const result = await syncAuditLogToManager(input);

    expect(result).toBe(true);
    expect(postManagerJson).toHaveBeenCalledWith(
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
    vi.mocked(postManagerJson).mockResolvedValue(
      new Response("error", { status: 500 }),
    );

    const result = await syncAuditLogToManager(input);

    expect(result).toBe(false);
  });
});
