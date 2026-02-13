import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@tumiki/db";
import { getRequestLogsStats } from "../getRequestLogsStats";
import type { McpServerId } from "@/schema/ids";

// 現在日時を2024-12-05にモック
const mockNow = new Date("2024-12-05T12:00:00.000Z");

// CI環境ではテスト用DBが利用できないためスキップ
describe.skipIf(process.env.CI === "true")("getRequestLogsStats", () => {
  const testMcpServerId = "test-mcp-server-stats-001" as McpServerId;
  const testOrganizationId = "test-org-stats-001" as const;
  const testUserId = "test-user-stats-001" as const;

  beforeAll(async () => {
    // 日付をモック
    vi.setSystemTime(mockNow);

    // 既存のテストデータをクリーンアップ（前回のテストが途中で失敗した場合に備えて）
    await db.mcpServerRequestLog.deleteMany({
      where: { mcpServerId: testMcpServerId },
    });
    await db.mcpServer.deleteMany({
      where: { id: testMcpServerId },
    });
    await db.organization.deleteMany({
      where: { id: testOrganizationId },
    });
    await db.user.deleteMany({
      where: { id: testUserId },
    });

    // テスト用のユーザーを作成
    await db.user.create({
      data: {
        id: testUserId,
        name: "Test User Stats",
        email: "test-user-stats-001@example.com",
        emailVerified: new Date(),
      },
    });

    // テスト用の組織を作成
    await db.organization.create({
      data: {
        id: testOrganizationId,
        name: "Test Organization Stats",
        slug: "test-org-stats-001",
        creator: {
          connect: {
            id: testUserId,
          },
        },
      },
    });

    // テスト用のMCPサーバーを作成
    await db.mcpServer.create({
      data: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
        name: "Test MCP Server",
        slug: "test-mcp-server-stats",
        description: "Test server for request logs stats",
        serverStatus: "RUNNING",
        serverType: "OFFICIAL",
      },
    });

    // テスト用のリクエストログを作成（2024-12-01 ~ 2024-12-05）
    const logsToCreate = [
      // 2024-12-01
      {
        id: "log-001",
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        httpStatus: 200,
        createdAt: new Date("2024-12-01T10:00:00.000Z"),
        transportType: "STDIO" as const,
        method: "tools/list",
        toolName: "list_tools",
        durationMs: 100,
        inputBytes: 0,
        outputBytes: 0,
        userId: testUserId,
      },
      {
        id: "log-002",
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        httpStatus: 500,
        createdAt: new Date("2024-12-01T15:00:00.000Z"),
        transportType: "STDIO" as const,
        method: "tools/call",
        toolName: "call_tool",
        durationMs: 200,
        inputBytes: 0,
        outputBytes: 0,
        userId: testUserId,
      },
      // 2024-12-02
      {
        id: "log-003",
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        httpStatus: 200,
        createdAt: new Date("2024-12-02T09:00:00.000Z"),
        transportType: "STDIO" as const,
        method: "tools/list",
        toolName: "list_tools",
        durationMs: 150,
        inputBytes: 0,
        outputBytes: 0,
        userId: testUserId,
      },
      {
        id: "log-004",
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        httpStatus: 200,
        createdAt: new Date("2024-12-02T14:00:00.000Z"),
        transportType: "STDIO" as const,
        method: "resources/read",
        toolName: "read_resource",
        durationMs: 300,
        inputBytes: 0,
        outputBytes: 0,
        userId: testUserId,
      },
      {
        id: "log-005",
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        httpStatus: 404,
        createdAt: new Date("2024-12-02T16:00:00.000Z"),
        transportType: "STDIO" as const,
        method: "tools/call",
        toolName: "call_tool",
        durationMs: 50,
        inputBytes: 0,
        outputBytes: 0,
        userId: testUserId,
      },
      // 2024-12-03（ログなし）
      // 2024-12-04
      {
        id: "log-006",
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        httpStatus: 200,
        createdAt: new Date("2024-12-04T11:00:00.000Z"),
        transportType: "STDIO" as const,
        method: "prompts/list",
        toolName: "list_prompts",
        durationMs: 80,
        inputBytes: 0,
        outputBytes: 0,
        userId: testUserId,
      },
      // 2024-12-05
      {
        id: "log-007",
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        httpStatus: 200,
        createdAt: new Date("2024-12-05T08:00:00.000Z"),
        transportType: "STDIO" as const,
        method: "tools/list",
        toolName: "list_tools",
        durationMs: 120,
        inputBytes: 0,
        outputBytes: 0,
        userId: testUserId,
      },
      {
        id: "log-008",
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        httpStatus: 500,
        createdAt: new Date("2024-12-05T17:00:00.000Z"),
        transportType: "STDIO" as const,
        method: "tools/call",
        toolName: "call_tool",
        durationMs: 250,
        inputBytes: 0,
        outputBytes: 0,
        userId: testUserId,
      },
    ];

    for (const logData of logsToCreate) {
      await db.mcpServerRequestLog.create({
        data: logData,
      });
    }
  });

  afterAll(async () => {
    // モックをクリーンアップ
    vi.useRealTimers();

    // テストデータのクリーンアップ（deleteManyでレコードがなくてもエラーにならない）
    await db.mcpServerRequestLog.deleteMany({
      where: { mcpServerId: testMcpServerId },
    });

    await db.mcpServer.deleteMany({
      where: { id: testMcpServerId },
    });

    await db.organization.deleteMany({
      where: { id: testOrganizationId },
    });

    await db.user.deleteMany({
      where: { id: testUserId },
    });
  });

  test("期間内の日別リクエスト統計を正しく取得できる", async () => {
    const result = await getRequestLogsStats(db, {
      userMcpServerId: testMcpServerId,
      organizationId: testOrganizationId,
      days: 5,
      timezone: "UTC",
      granularity: "day",
    });

    expect(result).toHaveLength(5);

    // 2024-12-01: 成功1件、エラー1件
    expect(result[0]).toStrictEqual({
      date: "2024-12-01",
      successCount: 1,
      errorCount: 1,
      totalCount: 2,
    });

    // 2024-12-02: 成功2件、エラー1件
    expect(result[1]).toStrictEqual({
      date: "2024-12-02",
      successCount: 2,
      errorCount: 1,
      totalCount: 3,
    });

    // 2024-12-03: ログなし
    expect(result[2]).toStrictEqual({
      date: "2024-12-03",
      successCount: 0,
      errorCount: 0,
      totalCount: 0,
    });

    // 2024-12-04: 成功1件
    expect(result[3]).toStrictEqual({
      date: "2024-12-04",
      successCount: 1,
      errorCount: 0,
      totalCount: 1,
    });

    // 2024-12-05: 成功1件、エラー1件
    expect(result[4]).toStrictEqual({
      date: "2024-12-05",
      successCount: 1,
      errorCount: 1,
      totalCount: 2,
    });
  });

  test("存在しないサーバーIDの場合はエラーを返す", async () => {
    await expect(
      getRequestLogsStats(db, {
        userMcpServerId: "non-existent-server" as McpServerId,
        organizationId: testOrganizationId,
        days: 5,
        timezone: "UTC",
        granularity: "day",
      }),
    ).rejects.toThrow("サーバーが見つかりません");
  });

  test("Asia/Tokyoタイムゾーンで正しく集計できる", async () => {
    const result = await getRequestLogsStats(db, {
      userMcpServerId: testMcpServerId,
      organizationId: testOrganizationId,
      days: 5,
      timezone: "Asia/Tokyo",
      granularity: "day",
    });

    // Asia/Tokyo（UTC+9）でも同じ結果になることを確認
    expect(result).toHaveLength(5);
    expect(result[0]?.date).toBe("2024-12-01");
    expect(result[4]?.date).toBe("2024-12-05");
  });
});
