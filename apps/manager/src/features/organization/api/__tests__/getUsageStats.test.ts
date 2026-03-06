import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { getUsageStats } from "../getUsageStats";
import type { ProtectedContext } from "@/server/api/trpc";

// validateOrganizationAccessをモック
vi.mock("@/server/utils/organizationPermissions", () => ({
  validateOrganizationAccess: vi.fn(),
}));

describe("getUsageStats", () => {
  const testOrgId = "org-test-001";
  const testUser1 = {
    id: "user-001",
    name: "User One",
    email: "user1@example.com",
    image: null,
  };
  const testUser2 = {
    id: "user-002",
    name: "User Two",
    email: "user2@example.com",
    image: null,
  };

  let mockDb: {
    mcpServerRequestLog: {
      groupBy: ReturnType<typeof vi.fn>;
    };
    organizationMember: {
      findMany: ReturnType<typeof vi.fn>;
    };
    $queryRaw: ReturnType<typeof vi.fn>;
  };

  let mockCtx: ProtectedContext;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2024-12-15T12:00:00.000Z"));

    mockDb = {
      mcpServerRequestLog: {
        groupBy: vi.fn(),
      },
      organizationMember: {
        findMany: vi.fn(),
      },
      $queryRaw: vi.fn(),
    };

    mockCtx = {
      db: mockDb,
      currentOrg: { id: testOrgId },
    } as unknown as ProtectedContext;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("ユーザー別のリクエスト数と最終アクティビティを正しく集計する", async () => {
    const lastActivity1 = new Date("2024-12-15T10:00:00.000Z");
    const lastActivity2 = new Date("2024-12-14T08:00:00.000Z");

    mockDb.mcpServerRequestLog.groupBy.mockResolvedValue([
      {
        userId: "user-001",
        _count: { id: 15 },
        _max: { createdAt: lastActivity1 },
      },
      {
        userId: "user-002",
        _count: { id: 5 },
        _max: { createdAt: lastActivity2 },
      },
    ]);

    mockDb.organizationMember.findMany.mockResolvedValue([
      { user: testUser1 },
      { user: testUser2 },
    ]);

    mockDb.$queryRaw.mockResolvedValue([]);

    const result = await getUsageStats({ ctx: mockCtx });

    expect(result.totalRequests).toBe(20);
    expect(result.uniqueUsers).toBe(2);

    // ユーザー1のリクエスト数と最終アクティビティ
    const user1Stats = result.memberStats.find((m) => m.user.id === "user-001");
    expect(user1Stats?.requestCount).toBe(15);
    expect(user1Stats?.lastActivity).toBe(lastActivity1.getTime());

    // ユーザー2のリクエスト数と最終アクティビティ
    const user2Stats = result.memberStats.find((m) => m.user.id === "user-002");
    expect(user2Stats?.requestCount).toBe(5);
    expect(user2Stats?.lastActivity).toBe(lastActivity2.getTime());
  });

  test("リクエストゼロのユーザーは0件と表示される", async () => {
    // ユーザー1のみリクエストあり
    mockDb.mcpServerRequestLog.groupBy.mockResolvedValue([
      {
        userId: "user-001",
        _count: { id: 10 },
        _max: { createdAt: new Date("2024-12-15T10:00:00.000Z") },
      },
    ]);

    // ユーザー2はメンバーだがリクエストなし
    mockDb.organizationMember.findMany.mockResolvedValue([
      { user: testUser1 },
      { user: testUser2 },
    ]);

    mockDb.$queryRaw.mockResolvedValue([]);

    const result = await getUsageStats({ ctx: mockCtx });

    const user2Stats = result.memberStats.find((m) => m.user.id === "user-002");
    expect(user2Stats?.requestCount).toBe(0);
    expect(user2Stats?.lastActivity).toBeNull();
  });

  test("日別集計が正しく補完される", async () => {
    mockDb.mcpServerRequestLog.groupBy.mockResolvedValue([]);
    mockDb.organizationMember.findMany.mockResolvedValue([]);

    // 一部の日のみデータあり
    mockDb.$queryRaw.mockResolvedValue([
      { date: "2024-12-10", requests: 5 },
      { date: "2024-12-15", requests: 12 },
    ]);

    const result = await getUsageStats({ ctx: mockCtx });

    // 30日分のデータが返される
    expect(result.dailyStats).toHaveLength(30);

    // データがある日のリクエスト数
    const dec10 = result.dailyStats.find((d) => d.date === "2024-12-10");
    expect(dec10?.requests).toBe(5);

    const dec15 = result.dailyStats.find((d) => d.date === "2024-12-15");
    expect(dec15?.requests).toBe(12);

    // データがない日は0
    const dec11 = result.dailyStats.find((d) => d.date === "2024-12-11");
    expect(dec11?.requests).toBe(0);
  });

  test("リクエストが全くない場合の処理", async () => {
    mockDb.mcpServerRequestLog.groupBy.mockResolvedValue([]);
    mockDb.organizationMember.findMany.mockResolvedValue([{ user: testUser1 }]);
    mockDb.$queryRaw.mockResolvedValue([]);

    const result = await getUsageStats({ ctx: mockCtx });

    expect(result.totalRequests).toBe(0);
    expect(result.uniqueUsers).toBe(0);
    expect(result.memberStats[0]?.requestCount).toBe(0);
    expect(result.memberStats[0]?.lastActivity).toBeNull();
    expect(result.dailyStats.every((d) => d.requests === 0)).toBe(true);
  });
});
