import { describe, test, expect, vi, beforeEach } from "vitest";
import { sendToolChangeNotifications } from "../sendToolChangeNotifications";
import type { RefreshToolsOutput } from "../refreshTools";

// createBulkNotificationsのモック
vi.mock("@/features/notification", () => ({
  createBulkNotifications: vi.fn(),
}));

import { createBulkNotifications } from "@/features/notification";

const createMockDb = () => ({
  mcpServer: {
    findUnique: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
});

const createMockResult = (
  overrides: Partial<RefreshToolsOutput> = {},
): RefreshToolsOutput => ({
  success: true,
  templateInstances: [],
  totalAddedCount: 0,
  totalRemovedCount: 0,
  totalModifiedCount: 0,
  hasAnyChanges: false,
  affectedOrganizations: [],
  ...overrides,
});

describe("sendToolChangeNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("変更がない場合は通知を送信しない", async () => {
    const db = createMockDb();
    const result = createMockResult({ hasAnyChanges: false });

    await sendToolChangeNotifications(db as never, {
      result,
      mcpServerId: "mcp-1",
      organizationId: "org-1",
      organizationSlug: "test-org",
      triggeredById: "user-1",
    });

    expect(createBulkNotifications).not.toHaveBeenCalled();
  });

  test("変更がある場合は現在の組織に通知を送信する", async () => {
    const db = createMockDb();
    db.mcpServer.findUnique.mockResolvedValue({ name: "Test Server" });

    const result = createMockResult({
      hasAnyChanges: true,
      totalAddedCount: 2,
      totalRemovedCount: 1,
      totalModifiedCount: 0,
      affectedOrganizations: [],
    });

    await sendToolChangeNotifications(db as never, {
      result,
      mcpServerId: "mcp-1",
      organizationId: "org-1",
      organizationSlug: "test-org",
      triggeredById: "user-1",
    });

    expect(createBulkNotifications).toHaveBeenCalledTimes(1);
    expect(createBulkNotifications).toHaveBeenCalledWith(db, {
      type: "MCP_TOOL_CHANGED",
      priority: "NORMAL",
      title: "MCPサーバーのツールが更新されました",
      message:
        "「Test Server」のツールが更新されました: 2個のツールが追加、1個のツールが削除",
      linkUrl: "/test-org/mcps/mcp-1",
      organizationId: "org-1",
      triggeredById: "user-1",
    });
  });

  test("他の組織に影響がある場合は他組織にも通知を送信する", async () => {
    const db = createMockDb();
    db.mcpServer.findUnique.mockResolvedValue({ name: "Test Server" });
    db.organization.findUnique.mockResolvedValue({ slug: "other-org" });

    const result = createMockResult({
      hasAnyChanges: true,
      totalAddedCount: 1,
      affectedOrganizations: [
        {
          organizationId: "org-2",
          mcpServerId: "mcp-2",
          mcpServerName: "Other Server",
        },
      ],
    });

    await sendToolChangeNotifications(db as never, {
      result,
      mcpServerId: "mcp-1",
      organizationId: "org-1",
      organizationSlug: "test-org",
      triggeredById: "user-1",
    });

    expect(createBulkNotifications).toHaveBeenCalledTimes(2);

    // 現在の組織への通知
    expect(createBulkNotifications).toHaveBeenNthCalledWith(1, db, {
      type: "MCP_TOOL_CHANGED",
      priority: "NORMAL",
      title: "MCPサーバーのツールが更新されました",
      message: "「Test Server」のツールが更新されました: 1個のツールが追加",
      linkUrl: "/test-org/mcps/mcp-1",
      organizationId: "org-1",
      triggeredById: "user-1",
    });

    // 他組織への通知
    expect(createBulkNotifications).toHaveBeenNthCalledWith(2, db, {
      type: "MCP_TOOL_CHANGED",
      priority: "HIGH",
      title: "共有MCPサーバーのツールが変更されました",
      message:
        "「Other Server」で使用しているMCPサーバーテンプレートのツールが外部から変更されました: 1個のツールが追加。ツール一覧を確認してください。",
      linkUrl: "/other-org/mcps/mcp-2",
      organizationId: "org-2",
      triggeredById: "user-1",
    });
  });

  test("MCPサーバー名が取得できない場合は空文字で通知を送信する", async () => {
    const db = createMockDb();
    db.mcpServer.findUnique.mockResolvedValue(null);

    const result = createMockResult({
      hasAnyChanges: true,
      totalModifiedCount: 3,
    });

    await sendToolChangeNotifications(db as never, {
      result,
      mcpServerId: "mcp-1",
      organizationId: "org-1",
      organizationSlug: "test-org",
      triggeredById: "user-1",
    });

    expect(createBulkNotifications).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        message: "「」のツールが更新されました: 3個のツールが変更",
      }),
    );
  });

  test("他組織のslugが取得できない場合はorganizationIdをフォールバックとして使用する", async () => {
    const db = createMockDb();
    db.mcpServer.findUnique.mockResolvedValue({ name: "Test Server" });
    db.organization.findUnique.mockResolvedValue(null);

    const result = createMockResult({
      hasAnyChanges: true,
      totalAddedCount: 1,
      affectedOrganizations: [
        {
          organizationId: "org-2",
          mcpServerId: "mcp-2",
          mcpServerName: "Other Server",
        },
      ],
    });

    await sendToolChangeNotifications(db as never, {
      result,
      mcpServerId: "mcp-1",
      organizationId: "org-1",
      organizationSlug: "test-org",
      triggeredById: "user-1",
    });

    // 他組織への通知でorganizationIdがフォールバックとして使われる
    expect(createBulkNotifications).toHaveBeenNthCalledWith(
      2,
      db,
      expect.objectContaining({
        linkUrl: "/org-2/mcps/mcp-2",
      }),
    );
  });

  test("複数の他組織に影響がある場合はすべてに通知を送信する", async () => {
    const db = createMockDb();
    db.mcpServer.findUnique.mockResolvedValue({ name: "Test Server" });
    db.organization.findUnique
      .mockResolvedValueOnce({ slug: "org-a" })
      .mockResolvedValueOnce({ slug: "org-b" });

    const result = createMockResult({
      hasAnyChanges: true,
      totalRemovedCount: 2,
      affectedOrganizations: [
        {
          organizationId: "org-2",
          mcpServerId: "mcp-2",
          mcpServerName: "Server A",
        },
        {
          organizationId: "org-3",
          mcpServerId: "mcp-3",
          mcpServerName: "Server B",
        },
      ],
    });

    await sendToolChangeNotifications(db as never, {
      result,
      mcpServerId: "mcp-1",
      organizationId: "org-1",
      organizationSlug: "test-org",
      triggeredById: "user-1",
    });

    // 現在の組織 + 2つの他組織 = 3回の通知
    expect(createBulkNotifications).toHaveBeenCalledTimes(3);
  });
});
