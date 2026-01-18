/**
 * ツール集約サービスのテスト
 */

/* eslint-disable @typescript-eslint/unbound-method */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// DBをモック
vi.mock("@tumiki/db/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@tumiki/db/server")>();
  return {
    ...mod,
    db: {
      mcpServer: {
        findUnique: vi.fn(),
      },
    },
  };
});

// キャッシュをモック
vi.mock("../../../libs/cache/unifiedToolsCache.js", () => ({
  getUnifiedToolsFromCache: vi.fn(),
  setUnifiedToolsCache: vi.fn(),
}));

// loggerをモック
vi.mock("../../../libs/logger/index.js", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import { db } from "@tumiki/db/server";
import {
  getUnifiedToolsFromCache,
  setUnifiedToolsCache,
} from "../../../libs/cache/unifiedToolsCache.js";
import { aggregateTools } from "../toolsAggregator.js";

describe("aggregateTools", () => {
  const unifiedMcpServerId = "unified-server-123";

  const mockTool1 = {
    name: "tool1",
    description: "Tool 1 description",
    inputSchema: { type: "object" },
  };

  const mockTool2 = {
    name: "tool2",
    description: "Tool 2 description",
    inputSchema: { type: "object", properties: { name: { type: "string" } } },
  };

  const mockTemplate1 = {
    id: "template-1",
    name: "Template 1",
    mcpTools: [mockTool1],
  };

  const mockTemplate2 = {
    id: "template-2",
    name: "Template 2",
    mcpTools: [mockTool2],
  };

  const mockTemplateInstance1 = {
    id: "instance-1",
    normalizedName: "instance_a",
    isEnabled: true,
    displayOrder: 0,
    mcpServerTemplate: mockTemplate1,
  };

  const mockTemplateInstance2 = {
    id: "instance-2",
    normalizedName: "instance_b",
    isEnabled: true,
    displayOrder: 1,
    mcpServerTemplate: mockTemplate2,
  };

  const mockUnifiedServer = {
    id: unifiedMcpServerId,
    name: "Unified Server",
    templateInstances: [mockTemplateInstance1, mockTemplateInstance2],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("キャッシュがある場合はキャッシュを返す", async () => {
    const cachedTools = [
      {
        name: `${unifiedMcpServerId}__instance_a__tool1`,
        description: "Tool 1 description",
        inputSchema: { type: "object" },
        mcpServerId: unifiedMcpServerId,
        instanceName: "instance_a",
      },
    ];

    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(cachedTools);

    const result = await aggregateTools(unifiedMcpServerId);

    expect(result).toStrictEqual(cachedTools);
    expect(getUnifiedToolsFromCache).toHaveBeenCalledWith(unifiedMcpServerId);
    expect(db.mcpServer.findUnique).not.toHaveBeenCalled();
  });

  test("キャッシュがない場合はDBから取得してキャッシュに保存する", async () => {
    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.mcpServer.findUnique).mockResolvedValue(
      mockUnifiedServer as never,
    );
    vi.mocked(setUnifiedToolsCache).mockResolvedValue(undefined);

    const result = await aggregateTools(unifiedMcpServerId);

    expect(result).toHaveLength(2);
    expect(result[0]).toStrictEqual({
      name: `${unifiedMcpServerId}__instance_a__tool1`,
      description: "Tool 1 description",
      inputSchema: { type: "object" },
      mcpServerId: unifiedMcpServerId,
      instanceName: "instance_a",
    });
    expect(result[1]).toStrictEqual({
      name: `${unifiedMcpServerId}__instance_b__tool2`,
      description: "Tool 2 description",
      inputSchema: { type: "object", properties: { name: { type: "string" } } },
      mcpServerId: unifiedMcpServerId,
      instanceName: "instance_b",
    });

    expect(setUnifiedToolsCache).toHaveBeenCalledWith(
      unifiedMcpServerId,
      result,
    );
  });

  test("統合MCPサーバーが見つからない場合はエラーをスローする", async () => {
    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.mcpServer.findUnique).mockResolvedValue(null);

    await expect(aggregateTools(unifiedMcpServerId)).rejects.toThrow(
      `Unified MCP server not found: ${unifiedMcpServerId}`,
    );
  });

  test("有効なテンプレートインスタンスがない場合は空配列を返す", async () => {
    const unifiedServerWithNoInstances = {
      ...mockUnifiedServer,
      templateInstances: [],
    };

    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.mcpServer.findUnique).mockResolvedValue(
      unifiedServerWithNoInstances as never,
    );
    vi.mocked(setUnifiedToolsCache).mockResolvedValue(undefined);

    const result = await aggregateTools(unifiedMcpServerId);

    expect(result).toStrictEqual([]);
    expect(setUnifiedToolsCache).toHaveBeenCalledWith(unifiedMcpServerId, []);
  });

  test("複数ツールを持つテンプレートの全ツールを集約する", async () => {
    const mockTool3 = {
      name: "tool3",
      description: "Tool 3 description",
      inputSchema: { type: "object" },
    };

    const templateWithMultipleTools = {
      id: "template-multi",
      name: "Multi Tool Template",
      mcpTools: [mockTool1, mockTool3],
    };

    const instanceWithMultipleTools = {
      id: "instance-multi",
      normalizedName: "multi_tools",
      isEnabled: true,
      displayOrder: 0,
      mcpServerTemplate: templateWithMultipleTools,
    };

    const unifiedServerWithMultipleTools = {
      id: unifiedMcpServerId,
      name: "Unified Server",
      templateInstances: [instanceWithMultipleTools],
    };

    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.mcpServer.findUnique).mockResolvedValue(
      unifiedServerWithMultipleTools as never,
    );
    vi.mocked(setUnifiedToolsCache).mockResolvedValue(undefined);

    const result = await aggregateTools(unifiedMcpServerId);

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe(`${unifiedMcpServerId}__multi_tools__tool1`);
    expect(result[1]?.name).toBe(`${unifiedMcpServerId}__multi_tools__tool3`);
  });

  test("ツール名は3階層フォーマットで生成される", async () => {
    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.mcpServer.findUnique).mockResolvedValue(
      mockUnifiedServer as never,
    );
    vi.mocked(setUnifiedToolsCache).mockResolvedValue(undefined);

    const result = await aggregateTools(unifiedMcpServerId);

    // 全てのツール名が 統合サーバーID__インスタンス名__ツール名 の形式であることを確認
    for (const tool of result) {
      const parts = tool.name.split("__");
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe(unifiedMcpServerId);
      expect(parts[1]).toMatch(/^instance_[ab]$/);
      expect(parts[2]).toMatch(/^tool[12]$/);
    }
  });

  test("mcpServerIdは統合サーバーIDが設定される", async () => {
    vi.mocked(getUnifiedToolsFromCache).mockResolvedValue(null);
    vi.mocked(db.mcpServer.findUnique).mockResolvedValue(
      mockUnifiedServer as never,
    );
    vi.mocked(setUnifiedToolsCache).mockResolvedValue(undefined);

    const result = await aggregateTools(unifiedMcpServerId);

    // 全てのツールで mcpServerId が統合サーバーIDであることを確認
    for (const tool of result) {
      expect(tool.mcpServerId).toBe(unifiedMcpServerId);
    }
  });
});
