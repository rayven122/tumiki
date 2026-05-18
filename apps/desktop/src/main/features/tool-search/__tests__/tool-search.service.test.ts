import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import type { PrismaClient } from "@prisma/desktop-client";
import { join } from "node:path";
import {
  cleanupTestDb,
  createTestDb,
} from "../../../shared/test-helpers/test-db";
import {
  createDesktopToolSearchProvider,
  searchTools,
} from "../tool-search.service";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
  },
}));

const TEST_DB_PATH = join(__dirname, "test-tool-search.db");

let db: PrismaClient;

beforeAll(async () => {
  db = await createTestDb(TEST_DB_PATH);
});

beforeEach(async () => {
  await db.mcpConnection.deleteMany();
  await db.mcpSecret.deleteMany();
  await db.mcpServer.deleteMany();
});

afterAll(async () => {
  await cleanupTestDb(db, TEST_DB_PATH);
});

const seedTool = async (input: { inputSchema?: string } = {}) => {
  const server = await db.mcpServer.create({
    data: {
      name: "GitHub",
      slug: "github",
      description: "",
      serverType: "OFFICIAL",
      dynamicSearch: true,
    },
  });
  const secret = await db.mcpSecret.create({
    data: { credentials: "{}" },
  });
  const connection = await db.mcpConnection.create({
    data: {
      name: "GitHub",
      slug: "github",
      transportType: "STDIO",
      command: "npx",
      args: "[]",
      url: null,
      authType: "NONE",
      serverId: server.id,
      catalogId: null,
      secretId: secret.id,
    },
  });
  const tool = await db.mcpTool.create({
    data: {
      name: "search_issues",
      description: "Find\nproject   issues",
      inputSchema: input.inputSchema ?? "{}",
      connectionId: connection.id,
    },
  });

  return { server, connection, tool };
};

describe("tool-search サービス", () => {
  test("Gateway embedding の類似度でツールを検索する", async () => {
    const { server, connection, tool } = await seedTool();
    const embedTexts = vi.fn().mockResolvedValue([
      [1, 0],
      [0.9, 0],
    ]);

    const results = await searchTools(
      {
        serverId: server.id,
        query: "issue",
        limit: 5,
        dynamicSearchOnly: true,
      },
      { db, embedTexts },
    );

    expect(embedTexts).toHaveBeenCalledWith([
      "issue",
      "search_issues Find project issues",
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]).toStrictEqual({
      toolId: tool.id,
      toolName: "github__search_issues",
      displayName: "search_issues",
      description: "Find\nproject   issues",
      inputSchema: "{}",
      connectionId: connection.id,
      connectionName: "GitHub",
      connectionSlug: "github",
      serverId: server.id,
      serverName: "GitHub",
      serverSlug: "github",
      score: 1,
    });
  });

  test("類似度が0のツールは返さない", async () => {
    const { server } = await seedTool();
    const embedTexts = vi.fn().mockResolvedValue([
      [1, 0],
      [0, 1],
    ]);

    await expect(
      searchTools(
        {
          serverId: server.id,
          query: "issue",
          dynamicSearchOnly: true,
        },
        { db, embedTexts },
      ),
    ).resolves.toStrictEqual([]);
  });

  test("空クエリの場合はembeddingを呼ばずに空配列を返す", async () => {
    const embedTexts = vi.fn();

    await expect(
      searchTools({ query: "   " }, { db, embedTexts }),
    ).resolves.toStrictEqual([]);
    expect(embedTexts).not.toHaveBeenCalled();
  });

  test("limitが0の場合はembeddingを呼ばずに空配列を返す", async () => {
    const embedTexts = vi.fn();

    await expect(
      searchTools({ query: "issue", limit: 0 }, { db, embedTexts }),
    ).resolves.toStrictEqual([]);
    expect(embedTexts).not.toHaveBeenCalled();
  });

  test("検索対象ツールが存在しない場合はembeddingを呼ばずに空配列を返す", async () => {
    const embedTexts = vi.fn();

    await expect(
      searchTools({ query: "issue" }, { db, embedTexts }),
    ).resolves.toStrictEqual([]);
    expect(embedTexts).not.toHaveBeenCalled();
  });

  test("embeddingゲートウェイが失敗した場合はエラーを呼び出し元へ伝播する", async () => {
    const { server } = await seedTool();
    const embedTexts = vi.fn().mockRejectedValue(new Error("gateway down"));

    await expect(
      searchTools(
        {
          serverId: server.id,
          query: "issue",
          dynamicSearchOnly: true,
        },
        { db, embedTexts },
      ),
    ).rejects.toThrow("gateway down");
  });

  test("describeToolsは壊れたinputSchemaを空オブジェクトとして返す", async () => {
    await seedTool({ inputSchema: "{broken-json" });
    const provider = createDesktopToolSearchProvider({ db });

    await expect(
      provider.describeTools({ toolNames: ["github__search_issues"] }),
    ).resolves.toStrictEqual([
      {
        toolName: "github__search_issues",
        description: "Find\nproject   issues",
        inputSchema: {},
        found: true,
      },
    ]);
  });
});
