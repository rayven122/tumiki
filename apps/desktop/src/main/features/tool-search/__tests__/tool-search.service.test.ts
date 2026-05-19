import {
  afterAll,
  afterEach,
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
import * as logger from "../../../shared/utils/logger";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
  },
}));

vi.mock("../../../shared/utils/logger", () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

const TEST_DB_PATH = join(__dirname, "test-tool-search.db");

let db: PrismaClient;

beforeAll(async () => {
  db = await createTestDb(TEST_DB_PATH);
});

beforeEach(async () => {
  vi.stubEnv("DYNAMIC_SEARCH_EMBEDDING_MODEL", "");
  await db.mcpConnection.deleteMany();
  await db.mcpSecret.deleteMany();
  await db.mcpServer.deleteMany();
  await db.mcpCatalog.deleteMany();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

afterAll(async () => {
  await cleanupTestDb(db, TEST_DB_PATH);
});

const waitForCacheRows = async (expectedLength: number) => {
  await vi.waitFor(async () => {
    await expect(db.mcpToolEmbeddingCache.count()).resolves.toBe(
      expectedLength,
    );
  });
  return db.mcpToolEmbeddingCache.findMany();
};

const seedTool = async (
  input: { inputSchema?: string; catalogConnection?: boolean } = {},
) => {
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
  const catalog = input.catalogConnection
    ? await db.mcpCatalog.create({
        data: {
          name: "GitHub Catalog",
          transportType: "STDIO",
          command: "npx",
          args: "[]",
          authType: "NONE",
          isOfficial: true,
        },
      })
    : null;
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
      catalogId: catalog?.id ?? null,
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
    await waitForCacheRows(1);
  });

  test("カタログ単独接続ではconnection slugのみのtoolNameを返す", async () => {
    const { server } = await seedTool({ catalogConnection: true });
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
    await waitForCacheRows(1);

    expect(results[0]?.toolName).toBe("github__search_issues");
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

  test("embeddingキャッシュ保存に失敗しても検索結果を返す", async () => {
    const { server } = await seedTool();
    const embedTexts = vi.fn().mockResolvedValue([
      [1, 0],
      [0.9, 0],
    ]);
    const upsert = vi.fn().mockRejectedValue(new Error("disk full"));
    // mcpToolは実DB delegateを使い、キャッシュdelegateだけ失敗させる
    const cacheDb = {
      mcpTool: db.mcpTool,
      mcpToolEmbeddingCache: {
        findMany: db.mcpToolEmbeddingCache.findMany.bind(
          db.mcpToolEmbeddingCache,
        ),
        upsert,
      },
    } as unknown as PrismaClient;

    const results = await searchTools(
      {
        serverId: server.id,
        query: "issue",
        limit: 5,
        dynamicSearchOnly: true,
      },
      { db: cacheDb, embedTexts },
    );

    expect(results).toHaveLength(1);
    await vi.waitFor(() => {
      expect(upsert).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        "動的検索embeddingキャッシュの保存に失敗しました",
        { error: "disk full" },
      );
    });
  });

  test("同じツール検索では保存済みembeddingを再利用してqueryだけをembeddingする", async () => {
    const { server } = await seedTool();
    const embedTexts = vi
      .fn()
      .mockResolvedValueOnce([
        [1, 0],
        [0.9, 0],
      ])
      .mockResolvedValueOnce([[1, 0]]);

    await searchTools(
      {
        serverId: server.id,
        query: "issue",
        limit: 5,
        dynamicSearchOnly: true,
      },
      { db, embedTexts },
    );
    const firstCache = await waitForCacheRows(1);
    expect(firstCache).toHaveLength(1);
    expect(firstCache[0]?.modelId).toBe("text-embedding-3-small");
    expect(firstCache[0]?.textVersion).toBe(1);
    expect(firstCache[0]?.dim).toBe(2);
    expect(firstCache[0]?.vector.byteLength).toBe(8);

    const results = await searchTools(
      {
        serverId: server.id,
        query: "issue",
        limit: 5,
        dynamicSearchOnly: true,
      },
      { db, embedTexts },
    );

    expect(embedTexts).toHaveBeenNthCalledWith(1, [
      "issue",
      "search_issues Find project issues",
    ]);
    expect(embedTexts).toHaveBeenNthCalledWith(2, ["issue"]);
    expect(results).toHaveLength(1);
    expect(results[0]?.score).toBe(1);
  });

  test("ツール検索テキストが変わった場合はembeddingキャッシュを更新する", async () => {
    const { server, tool } = await seedTool();
    const embedTexts = vi
      .fn()
      .mockResolvedValueOnce([
        [1, 0],
        [0.9, 0],
      ])
      .mockResolvedValueOnce([
        [1, 0],
        [0.8, 0],
      ]);

    await searchTools(
      {
        serverId: server.id,
        query: "issue",
        dynamicSearchOnly: true,
      },
      { db, embedTexts },
    );
    const [firstCache] = await waitForCacheRows(1);
    expect(firstCache).toBeDefined();

    await db.mcpTool.update({
      where: { id: tool.id },
      data: { customDescription: "Search pull requests" },
    });
    await searchTools(
      {
        serverId: server.id,
        query: "issue",
        dynamicSearchOnly: true,
      },
      { db, embedTexts },
    );
    expect(embedTexts).toHaveBeenNthCalledWith(2, [
      "issue",
      "search_issues Search pull requests",
    ]);
    await vi.waitFor(async () => {
      const cacheRows = await db.mcpToolEmbeddingCache.findMany();
      expect(cacheRows).toHaveLength(1);
      expect(cacheRows[0]?.id).toBe(firstCache?.id);
      expect(cacheRows[0]?.contentHash).not.toBe(firstCache?.contentHash);
    });
  });

  test("embeddingモデルが変わった場合は旧モデルキャッシュを削除する", async () => {
    const { server } = await seedTool();
    const embedTexts = vi.fn().mockResolvedValue([
      [1, 0],
      [0.9, 0],
    ]);

    await searchTools(
      {
        serverId: server.id,
        query: "issue",
        dynamicSearchOnly: true,
      },
      { db, embedTexts },
    );
    await waitForCacheRows(1);
    vi.stubEnv("DYNAMIC_SEARCH_EMBEDDING_MODEL", "custom-embedding-model");
    await searchTools(
      {
        serverId: server.id,
        query: "issue",
        dynamicSearchOnly: true,
      },
      { db, embedTexts },
    );

    await vi.waitFor(async () => {
      const cacheModels = await db.mcpToolEmbeddingCache.findMany({
        orderBy: { modelId: "asc" },
        select: { modelId: true },
      });
      expect(cacheModels).toStrictEqual([
        { modelId: "custom-embedding-model" },
      ]);
    });
    expect(embedTexts).toHaveBeenCalledTimes(2);
  });

  test("次元数が合わないembeddingキャッシュは再生成する", async () => {
    const { server } = await seedTool();
    const embedTexts = vi
      .fn()
      .mockResolvedValueOnce([
        [1, 0],
        [0.9, 0],
      ])
      .mockResolvedValueOnce([[1, 0]])
      .mockResolvedValueOnce([[0.8, 0]]);

    await searchTools(
      {
        serverId: server.id,
        query: "issue",
        dynamicSearchOnly: true,
      },
      { db, embedTexts },
    );
    const [cache] = await waitForCacheRows(1);
    if (!cache) {
      throw new Error("embeddingキャッシュが作成されていません");
    }
    await db.mcpToolEmbeddingCache.update({
      where: { id: cache.id },
      data: {
        dim: 3,
        vector: new Uint8Array(Float32Array.from([0.1, 0.2, 0.3]).buffer),
      },
    });

    const results = await searchTools(
      {
        serverId: server.id,
        query: "issue",
        dynamicSearchOnly: true,
      },
      { db, embedTexts },
    );

    expect(embedTexts).toHaveBeenNthCalledWith(2, ["issue"]);
    expect(embedTexts).toHaveBeenNthCalledWith(3, [
      "search_issues Find project issues",
    ]);
    expect(results).toHaveLength(1);
    await vi.waitFor(async () => {
      const refreshedCache = await db.mcpToolEmbeddingCache.findFirstOrThrow();
      expect(refreshedCache.dim).toBe(2);
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
    await waitForCacheRows(1);
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
