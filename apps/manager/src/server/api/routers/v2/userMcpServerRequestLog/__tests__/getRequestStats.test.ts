import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { subDays, subHours } from "date-fns";
import { getRequestStats } from "../getRequestStats";
import {
  db,
  TransportType,
  ServerStatus,
  ServerType,
  AuthType,
} from "@tumiki/db/server";
import type { McpServerId } from "@/schema/ids";

describe("getRequestStats", () => {
  const testOrganizationId = "test-org-id";
  const testMcpServerId = "test-mcp-server-id" as McpServerId;
  const testUserId = "test-user-id";
  const createdLogIds: string[] = [];

  beforeAll(async () => {
    // テスト用のMCPサーバーを作成
    await db.mcpServer.create({
      data: {
        id: testMcpServerId,
        organizationId: testOrganizationId,
        name: "テストMCPサーバー",
        description: "テスト用のサーバー",
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.OFFICIAL,
        authType: AuthType.API_KEY,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // テストデータを作成
    const now = new Date();
    const last2h = subHours(now, 2);
    const last5d = subDays(now, 5);
    const last10d = subDays(now, 10);

    const logsToCreate = [
      // 24時間以内の成功リクエスト
      {
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        userId: testUserId,
        toolName: "test-tool-1",
        transportType: TransportType.STDIO,
        method: "tools/call",
        httpStatus: 200,
        inputBytes: 100,
        outputBytes: 200,
        durationMs: 50,
        createdAt: last2h,
      },
      {
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        userId: testUserId,
        toolName: "test-tool-2",
        transportType: TransportType.STDIO,
        method: "tools/call",
        httpStatus: 201,
        inputBytes: 150,
        outputBytes: 250,
        durationMs: 75,
        createdAt: last2h,
      },
      // 7日以内のエラーリクエスト
      {
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        userId: testUserId,
        toolName: "test-tool-3",
        transportType: TransportType.SSE,
        method: "tools/call",
        httpStatus: 500,
        inputBytes: 200,
        outputBytes: 100,
        durationMs: 100,
        createdAt: last5d,
      },
      // 7日より前のリクエスト
      {
        mcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
        userId: testUserId,
        toolName: "test-tool-4",
        transportType: TransportType.STDIO,
        method: "tools/call",
        httpStatus: 200,
        inputBytes: 300,
        outputBytes: 400,
        durationMs: 150,
        createdAt: last10d,
      },
    ];

    for (const logData of logsToCreate) {
      const log = await db.mcpServerRequestLog.create({
        data: logData,
      });
      createdLogIds.push(log.id);
    }
  });

  afterAll(async () => {
    // テストデータをクリーンアップ
    if (createdLogIds.length > 0) {
      await db.mcpServerRequestLog.deleteMany({
        where: {
          id: {
            in: createdLogIds,
          },
        },
      });
    }

    await db.mcpServer.delete({
      where: {
        id: testMcpServerId,
      },
    });
  });

  test("リクエスト統計を正しく集計できる", async () => {
    const result = await db.$transaction(async (tx) => {
      return await getRequestStats(tx, {
        userMcpServerId: testMcpServerId,
        organizationId: testOrganizationId,
      });
    });

    // 全リクエスト数
    expect(result.totalRequests).toBe(4);

    // 成功リクエスト数（200-299）
    expect(result.successRequests).toBe(3);

    // エラーリクエスト数
    expect(result.errorRequests).toBe(1);

    // 合計バイト数
    expect(result.totalInputBytes).toBe(750); // 100 + 150 + 200 + 300
    expect(result.totalOutputBytes).toBe(950); // 200 + 250 + 100 + 400

    // 平均実行時間
    expect(result.averageDurationMs).toBe(94); // (50 + 75 + 100 + 150) / 4 = 93.75 → 94

    // 24時間以内のリクエスト数
    expect(result.last24hRequests).toBe(2);

    // 7日以内のリクエスト数
    expect(result.last7dRequests).toBe(3);
  });

  test("存在しないサーバーの場合はエラーを投げる", async () => {
    await expect(async () => {
      await db.$transaction(async (tx) => {
        return await getRequestStats(tx, {
          userMcpServerId: "non-existent-server-id" as McpServerId,
          organizationId: testOrganizationId,
        });
      });
    }).rejects.toThrow("サーバーが見つかりません");
  });

  test("リクエストログが存在しない場合でも正しく動作する", async () => {
    const emptyServerId = "empty-mcp-server-id" as McpServerId;

    // 空のMCPサーバーを作成
    await db.mcpServer.create({
      data: {
        id: emptyServerId,
        organizationId: testOrganizationId,
        name: "空のMCPサーバー",
        description: "空のテスト用サーバー",
        serverStatus: ServerStatus.RUNNING,
        serverType: ServerType.OFFICIAL,
        authType: AuthType.API_KEY,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    try {
      const result = await db.$transaction(async (tx) => {
        return await getRequestStats(tx, {
          userMcpServerId: emptyServerId,
          organizationId: testOrganizationId,
        });
      });

      expect(result.totalRequests).toBe(0);
      expect(result.successRequests).toBe(0);
      expect(result.errorRequests).toBe(0);
      expect(result.totalInputBytes).toBe(0);
      expect(result.totalOutputBytes).toBe(0);
      expect(result.averageDurationMs).toBe(0);
      expect(result.last24hRequests).toBe(0);
      expect(result.last7dRequests).toBe(0);
    } finally {
      // クリーンアップ
      await db.mcpServer.delete({
        where: {
          id: emptyServerId,
        },
      });
    }
  });
});
