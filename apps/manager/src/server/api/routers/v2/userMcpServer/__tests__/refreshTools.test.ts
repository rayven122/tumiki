import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  normalizeJson,
  isToolModified,
  detectToolChanges,
  buildHeaders,
} from "../refreshTools";
import type { PrismaTransactionClient } from "@tumiki/db";
import { AuthType } from "@tumiki/db/server";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

describe("normalizeJson", () => {
  test("nullの場合は空文字を返す", () => {
    const result = normalizeJson(null);

    expect(result).toBe("");
  });

  test("undefinedの場合は空文字を返す", () => {
    const result = normalizeJson(undefined);

    expect(result).toBe("");
  });

  test("プリミティブ値（文字列）の場合はJSON文字列を返す", () => {
    const result = normalizeJson("test");

    expect(result).toBe('"test"');
  });

  test("プリミティブ値（数値）の場合はJSON文字列を返す", () => {
    const result = normalizeJson(42);

    expect(result).toBe("42");
  });

  test("プリミティブ値（真偽値）の場合はJSON文字列を返す", () => {
    const result = normalizeJson(true);

    expect(result).toBe("true");
  });

  test("オブジェクトの場合はキーをソートしてJSON文字列を返す", () => {
    const input = { b: 2, a: 1, c: 3 };

    const result = normalizeJson(input);

    expect(result).toBe('{"a":1,"b":2,"c":3}');
  });

  test("空オブジェクトの場合は空オブジェクトのJSON文字列を返す", () => {
    const result = normalizeJson({});

    expect(result).toBe("{}");
  });

  test("配列の場合はJSON文字列を返す", () => {
    const result = normalizeJson([1, 2, 3]);

    expect(result).toBe("[1,2,3]");
  });
});

describe("isToolModified", () => {
  test("説明が変更された場合はtrueを返す", () => {
    const existingTool = {
      description: "古い説明",
      inputSchema: { type: "object" },
    };
    const newTool: Tool = {
      name: "test-tool",
      description: "新しい説明",
      inputSchema: { type: "object" },
    };

    const result = isToolModified(existingTool, newTool);

    expect(result).toBe(true);
  });

  test("inputSchemaのトップレベルキーが変更された場合はtrueを返す", () => {
    const existingTool = {
      description: "同じ説明",
      inputSchema: { type: "object", required: ["name"] },
    };
    const newTool: Tool = {
      name: "test-tool",
      description: "同じ説明",
      inputSchema: { type: "object", additionalProperties: false },
    };

    const result = isToolModified(existingTool, newTool);

    expect(result).toBe(true);
  });

  test("inputSchemaのプロパティ数が変更された場合はtrueを返す", () => {
    const existingTool = {
      description: "同じ説明",
      inputSchema: { type: "object" },
    };
    const newTool: Tool = {
      name: "test-tool",
      description: "同じ説明",
      inputSchema: { type: "object", required: ["field1"] },
    };

    const result = isToolModified(existingTool, newTool);

    expect(result).toBe(true);
  });

  test("説明もinputSchemaも同じ場合はfalseを返す", () => {
    const existingTool = {
      description: "同じ説明",
      inputSchema: { type: "object", properties: { a: { type: "string" } } },
    };
    const newTool: Tool = {
      name: "test-tool",
      description: "同じ説明",
      inputSchema: { type: "object", properties: { a: { type: "string" } } },
    };

    const result = isToolModified(existingTool, newTool);

    expect(result).toBe(false);
  });

  test("新しいツールのdescriptionがundefinedで既存が空文字の場合はfalseを返す", () => {
    const existingTool = {
      description: "",
      inputSchema: { type: "object" },
    };
    const newTool: Tool = {
      name: "test-tool",
      description: undefined,
      inputSchema: { type: "object" },
    };

    const result = isToolModified(existingTool, newTool);

    expect(result).toBe(false);
  });

  test("新しいツールのdescriptionがundefinedで既存が空文字でない場合はtrueを返す", () => {
    const existingTool = {
      description: "何かの説明",
      inputSchema: { type: "object" },
    };
    const newTool: Tool = {
      name: "test-tool",
      description: undefined,
      inputSchema: { type: "object" },
    };

    const result = isToolModified(existingTool, newTool);

    expect(result).toBe(true);
  });
});

describe("detectToolChanges", () => {
  test("新しいツールが追加された場合はaddedとして検出する", () => {
    const existingTools: Array<{
      id: string;
      name: string;
      description: string;
      inputSchema: unknown;
    }> = [];
    const newTools: Tool[] = [
      {
        name: "new-tool",
        description: "新しいツール",
        inputSchema: { type: "object" },
      },
    ];

    const result = detectToolChanges(existingTools, newTools);

    expect(result.changes).toStrictEqual([
      {
        type: "added",
        name: "new-tool",
        description: "新しいツール",
      },
    ]);
    expect(result.toCreate).toStrictEqual(newTools);
    expect(result.toConnect).toStrictEqual([]);
    expect(result.toDisconnect).toStrictEqual([]);
    expect(result.toUpdate).toStrictEqual([]);
  });

  test("既存ツールが削除された場合はremovedとして検出する", () => {
    const existingTools = [
      {
        id: "tool-1",
        name: "old-tool",
        description: "古いツール",
        inputSchema: { type: "object" },
      },
    ];
    const newTools: Tool[] = [];

    const result = detectToolChanges(existingTools, newTools);

    expect(result.changes).toStrictEqual([
      {
        type: "removed",
        name: "old-tool",
        description: "古いツール",
      },
    ]);
    expect(result.toDisconnect).toStrictEqual(["tool-1"]);
    expect(result.toCreate).toStrictEqual([]);
    expect(result.toConnect).toStrictEqual([]);
    expect(result.toUpdate).toStrictEqual([]);
  });

  test("既存ツールが変更された場合はmodifiedとして検出する", () => {
    const existingTools = [
      {
        id: "tool-1",
        name: "my-tool",
        description: "古い説明",
        inputSchema: { type: "object" },
      },
    ];
    const newTools: Tool[] = [
      {
        name: "my-tool",
        description: "新しい説明",
        inputSchema: { type: "object" },
      },
    ];

    const result = detectToolChanges(existingTools, newTools);

    expect(result.changes).toStrictEqual([
      {
        type: "modified",
        name: "my-tool",
        description: "新しい説明",
        previousDescription: "古い説明",
        previousInputSchema: { type: "object" },
      },
    ]);
    expect(result.toConnect).toStrictEqual(["tool-1"]);
    expect(result.toUpdate).toStrictEqual([
      {
        id: "tool-1",
        tool: newTools[0],
      },
    ]);
    expect(result.toCreate).toStrictEqual([]);
    expect(result.toDisconnect).toStrictEqual([]);
  });

  test("既存ツールが変更されていない場合はunchangedとしてchangesに含まれる", () => {
    const existingTools = [
      {
        id: "tool-1",
        name: "my-tool",
        description: "同じ説明",
        inputSchema: { type: "object" },
      },
    ];
    const newTools: Tool[] = [
      {
        name: "my-tool",
        description: "同じ説明",
        inputSchema: { type: "object" },
      },
    ];

    const result = detectToolChanges(existingTools, newTools);

    expect(result.changes).toStrictEqual([
      {
        type: "unchanged",
        name: "my-tool",
        description: "同じ説明",
      },
    ]);
    expect(result.toConnect).toStrictEqual(["tool-1"]);
    expect(result.toUpdate).toStrictEqual([]);
    expect(result.toCreate).toStrictEqual([]);
    expect(result.toDisconnect).toStrictEqual([]);
  });

  test("複数のツール変更を同時に検出する", () => {
    const existingTools = [
      {
        id: "tool-1",
        name: "unchanged-tool",
        description: "変更なし",
        inputSchema: { type: "object" },
      },
      {
        id: "tool-2",
        name: "modified-tool",
        description: "古い説明",
        inputSchema: { type: "object" },
      },
      {
        id: "tool-3",
        name: "removed-tool",
        description: "削除されるツール",
        inputSchema: { type: "object" },
      },
    ];
    const newTools: Tool[] = [
      {
        name: "unchanged-tool",
        description: "変更なし",
        inputSchema: { type: "object" },
      },
      {
        name: "modified-tool",
        description: "新しい説明",
        inputSchema: { type: "object" },
      },
      {
        name: "added-tool",
        description: "追加されたツール",
        inputSchema: { type: "object" },
      },
    ];

    const result = detectToolChanges(existingTools, newTools);

    // unchanged, modified, added, removed の4件
    expect(result.changes).toHaveLength(4);
    expect(result.changes).toContainEqual({
      type: "unchanged",
      name: "unchanged-tool",
      description: "変更なし",
    });
    expect(result.changes).toContainEqual({
      type: "added",
      name: "added-tool",
      description: "追加されたツール",
    });
    expect(result.changes).toContainEqual({
      type: "modified",
      name: "modified-tool",
      description: "新しい説明",
      previousDescription: "古い説明",
      previousInputSchema: { type: "object" },
    });
    expect(result.changes).toContainEqual({
      type: "removed",
      name: "removed-tool",
      description: "削除されるツール",
    });
    expect(result.toConnect).toStrictEqual(["tool-1", "tool-2"]);
    expect(result.toDisconnect).toStrictEqual(["tool-3"]);
    expect(result.toCreate).toHaveLength(1);
    expect(result.toUpdate).toHaveLength(1);
  });

  test("inputSchemaのトップレベルキーが変更された場合もmodifiedとして検出する", () => {
    const existingTools = [
      {
        id: "tool-1",
        name: "my-tool",
        description: "同じ説明",
        inputSchema: { type: "object", required: ["name"] },
      },
    ];
    const newTools: Tool[] = [
      {
        name: "my-tool",
        description: "同じ説明",
        inputSchema: { type: "object", additionalProperties: false },
      },
    ];

    const result = detectToolChanges(existingTools, newTools);

    expect(result.changes).toStrictEqual([
      {
        type: "modified",
        name: "my-tool",
        description: "同じ説明",
        previousDescription: "同じ説明",
        previousInputSchema: {
          type: "object",
          required: ["name"],
        },
      },
    ]);
    expect(result.toUpdate).toHaveLength(1);
  });

  test("空の既存ツールと空の新しいツールの場合は変更なし", () => {
    const result = detectToolChanges([], []);

    expect(result.changes).toStrictEqual([]);
    expect(result.toConnect).toStrictEqual([]);
    expect(result.toDisconnect).toStrictEqual([]);
    expect(result.toUpdate).toStrictEqual([]);
    expect(result.toCreate).toStrictEqual([]);
  });
});

describe("buildHeaders", () => {
  let mockTx: PrismaTransactionClient;
  const testUserId = "user-123";
  const testOrganizationId = "org-123";
  const testTemplateInstanceId = "instance-123";

  beforeEach(() => {
    mockTx = {
      mcpOAuthToken: {
        findFirst: vi.fn(),
      },
      mcpConfig: {
        findFirst: vi.fn(),
      },
    } as unknown as PrismaTransactionClient;
  });

  test("AuthType.NONEの場合は空のヘッダーを返す", async () => {
    const result = await buildHeaders(mockTx, {
      templateInstanceId: testTemplateInstanceId,
      userId: testUserId,
      organizationId: testOrganizationId,
      authType: AuthType.NONE,
    });

    expect(result).toStrictEqual({});
    expect(mockTx.mcpOAuthToken.findFirst).not.toHaveBeenCalled();
    expect(mockTx.mcpConfig.findFirst).not.toHaveBeenCalled();
  });

  test("AuthType.OAUTHの場合はBearerトークンを含むヘッダーを返す", async () => {
    vi.mocked(mockTx.mcpOAuthToken.findFirst).mockResolvedValue({
      accessToken: "test-access-token",
    } as Awaited<ReturnType<typeof mockTx.mcpOAuthToken.findFirst>>);

    const result = await buildHeaders(mockTx, {
      templateInstanceId: testTemplateInstanceId,
      userId: testUserId,
      organizationId: testOrganizationId,
      authType: AuthType.OAUTH,
    });

    expect(result).toStrictEqual({
      Authorization: "Bearer test-access-token",
    });
    expect(mockTx.mcpOAuthToken.findFirst).toHaveBeenCalledWith({
      where: {
        mcpServerTemplateInstanceId: testTemplateInstanceId,
        userId: testUserId,
        organizationId: testOrganizationId,
      },
    });
  });

  test("AuthType.OAUTHでトークンが見つからない場合はエラーをスローする", async () => {
    vi.mocked(mockTx.mcpOAuthToken.findFirst).mockResolvedValue(null);

    await expect(
      buildHeaders(mockTx, {
        templateInstanceId: testTemplateInstanceId,
        userId: testUserId,
        organizationId: testOrganizationId,
        authType: AuthType.OAUTH,
      }),
    ).rejects.toThrow(
      "OAuth認証が必要です。先にMCPサーバーの認証を完了してください。",
    );
  });

  test("AuthType.API_KEYの場合はenvVarsからヘッダーを構築する", async () => {
    vi.mocked(mockTx.mcpConfig.findFirst).mockResolvedValue({
      envVars: JSON.stringify({ "X-API-Key": "my-api-key" }),
    } as Awaited<ReturnType<typeof mockTx.mcpConfig.findFirst>>);

    const result = await buildHeaders(mockTx, {
      templateInstanceId: testTemplateInstanceId,
      userId: testUserId,
      organizationId: testOrganizationId,
      authType: AuthType.API_KEY,
    });

    expect(result).toStrictEqual({ "X-API-Key": "my-api-key" });
    expect(mockTx.mcpConfig.findFirst).toHaveBeenCalledWith({
      where: {
        mcpServerTemplateInstanceId: testTemplateInstanceId,
        organizationId: testOrganizationId,
        OR: [{ userId: testUserId }, { userId: null }],
      },
      orderBy: { userId: "desc" },
      select: { envVars: true },
    });
  });

  test("AuthType.API_KEYでmcpConfigが見つからない場合は空のヘッダーを返す", async () => {
    vi.mocked(mockTx.mcpConfig.findFirst).mockResolvedValue(null);

    const result = await buildHeaders(mockTx, {
      templateInstanceId: testTemplateInstanceId,
      userId: testUserId,
      organizationId: testOrganizationId,
      authType: AuthType.API_KEY,
    });

    expect(result).toStrictEqual({});
  });

  test("AuthType.API_KEYでenvVarsがnullの場合は空のヘッダーを返す", async () => {
    vi.mocked(mockTx.mcpConfig.findFirst).mockResolvedValue({
      envVars: null,
    } as unknown as Awaited<ReturnType<typeof mockTx.mcpConfig.findFirst>>);

    const result = await buildHeaders(mockTx, {
      templateInstanceId: testTemplateInstanceId,
      userId: testUserId,
      organizationId: testOrganizationId,
      authType: AuthType.API_KEY,
    });

    expect(result).toStrictEqual({});
  });

  test("AuthType.API_KEYでenvVarsが不正なJSONの場合は空のヘッダーを返す", async () => {
    vi.mocked(mockTx.mcpConfig.findFirst).mockResolvedValue({
      envVars: "invalid-json",
    } as Awaited<ReturnType<typeof mockTx.mcpConfig.findFirst>>);

    const result = await buildHeaders(mockTx, {
      templateInstanceId: testTemplateInstanceId,
      userId: testUserId,
      organizationId: testOrganizationId,
      authType: AuthType.API_KEY,
    });

    expect(result).toStrictEqual({});
  });
});
