import { beforeEach, describe, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";

const mockCreateMany = vi.hoisted(() => vi.fn());
const mockVerifyDesktopJwt = vi.hoisted(() => vi.fn());

vi.mock("@tumiki/internal-db/server", () => ({
  db: {
    desktopAuditLog: {
      createMany: mockCreateMany,
    },
  },
}));

vi.mock("~/lib/auth/verify-desktop-jwt", () => ({
  verifyDesktopJwt: mockVerifyDesktopJwt,
}));

import { POST } from "./route";

const validBody = {
  logs: [
    {
      sourceInstallationId: "installation-001",
      sourceAuditLogId: 10,
      mcpServerId: "3",
      connectionName: "GitHub",
      clientName: "Claude Code",
      clientVersion: "1.2.3",
      transportType: "STDIO",
      toolName: "list_repos",
      method: "tools/call",
      httpStatus: 200,
      durationMs: 342,
      inputBytes: 50,
      outputBytes: 1200,
      occurredAt: "2026-05-03T10:00:00.000Z",
    },
  ],
};

const buildRequest = (body: unknown = validBody) =>
  new Request("https://manager.example.com/api/internal/audit-logs", {
    method: "POST",
    headers: {
      Authorization: "Bearer access-token",
      "Content-Type": "application/json",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as NextRequest;

type InvalidRequestBodyResponse = {
  error: "Invalid request body";
  details: unknown;
};

describe("POST /api/internal/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyDesktopJwt.mockResolvedValue({ userId: "user-001" });
    mockCreateMany.mockResolvedValue({ count: 1 });
  });

  test("desktop監査ログを認証ユーザーに紐づけて冪等保存する", async () => {
    const response = await POST(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({ inserted: 1 });
    expect(response.status).toStrictEqual(200);
    expect(mockVerifyDesktopJwt).toHaveBeenCalledWith("Bearer access-token");
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        {
          sourceInstallationId: "installation-001",
          sourceAuditLogId: 10,
          userId: "user-001",
          mcpServerId: "3",
          connectionName: "GitHub",
          clientName: "Claude Code",
          clientVersion: "1.2.3",
          transportType: "STDIO",
          toolName: "list_repos",
          method: "tools/call",
          httpStatus: 200,
          durationMs: 342,
          inputBytes: 50,
          outputBytes: 1200,
          errorCode: undefined,
          errorSummary: undefined,
          occurredAt: new Date("2026-05-03T10:00:00.000Z"),
        },
      ],
      skipDuplicates: true,
    });
  });

  test("重複時はinserted 0を返す", async () => {
    mockCreateMany.mockResolvedValue({ count: 0 });

    const response = await POST(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({ inserted: 0 });
    expect(response.status).toStrictEqual(200);
  });

  test("認証に失敗した場合は401を返す", async () => {
    mockVerifyDesktopJwt.mockRejectedValue(new Error("Unauthorized"));

    const response = await POST(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
    expect(response.status).toStrictEqual(401);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  test("不正なJSONの場合は400を返す", async () => {
    const response = await POST(buildRequest("{"));

    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid JSON",
    });
    expect(response.status).toStrictEqual(400);
    expect(mockVerifyDesktopJwt).toHaveBeenCalledWith("Bearer access-token");
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  test("リクエストボディが不正な場合は400を返す", async () => {
    const response = await POST(buildRequest({ logs: [] }));
    const body = (await response.json()) as InvalidRequestBodyResponse;

    expect(body.error).toStrictEqual("Invalid request body");
    expect(body.details).toBeDefined();
    expect(response.status).toStrictEqual(400);
    expect(mockVerifyDesktopJwt).toHaveBeenCalledWith("Bearer access-token");
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  test("toolNameとmethodが空の場合は400を返す", async () => {
    const response = await POST(
      buildRequest({
        logs: [
          {
            ...validBody.logs[0],
            toolName: "",
            method: "",
          },
        ],
      }),
    );
    const body = (await response.json()) as InvalidRequestBodyResponse;

    expect(body.error).toStrictEqual("Invalid request body");
    expect(body.details).toBeDefined();
    expect(response.status).toStrictEqual(400);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  test("mcpServerIdが空またはhttpStatusが範囲外の場合は400を返す", async () => {
    const response = await POST(
      buildRequest({
        logs: [
          {
            ...validBody.logs[0],
            httpStatus: 99,
            mcpServerId: "",
          },
        ],
      }),
    );
    const body = (await response.json()) as InvalidRequestBodyResponse;

    expect(body.error).toStrictEqual("Invalid request body");
    expect(body.details).toBeDefined();
    expect(response.status).toStrictEqual(400);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  test("101件以上の送信は400を返す", async () => {
    const response = await POST(
      buildRequest({
        logs: Array.from({ length: 101 }, () => validBody.logs[0]),
      }),
    );
    const body = (await response.json()) as InvalidRequestBodyResponse;

    expect(body.error).toStrictEqual("Invalid request body");
    expect(body.details).toBeDefined();
    expect(response.status).toStrictEqual(400);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  test("DB障害時は500を返す", async () => {
    mockCreateMany.mockRejectedValue(new Error("DB connection failed"));

    const response = await POST(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Internal server error",
    });
    expect(response.status).toStrictEqual(500);
    expect(mockCreateMany).toHaveBeenCalled();
  });

  test("未認証の場合は不正なボディでも401を返す", async () => {
    mockVerifyDesktopJwt.mockRejectedValue(new Error("Unauthorized"));

    const response = await POST(buildRequest({ logs: [] }));

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
    expect(response.status).toStrictEqual(401);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });
});
