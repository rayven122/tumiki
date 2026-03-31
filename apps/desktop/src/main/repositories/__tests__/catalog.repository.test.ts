import { describe, test, expect, beforeEach, vi } from "vitest";
import * as catalogRepository from "../catalog.repository";
import type { CatalogSeedData } from "../catalog.repository";

describe("catalog.repository", () => {
  const mockMcpCatalog = {
    findMany: vi.fn(),
    upsert: vi.fn(),
  };

  const mockDb = {
    mcpCatalog: mockMcpCatalog,
  } as unknown as Parameters<typeof catalogRepository.findAll>[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findAll", () => {
    test("名前の昇順ですべてのカタログを取得する", async () => {
      const mockCatalogs = [
        { id: 1, name: "A Catalog", description: "desc" },
        { id: 2, name: "B Catalog", description: "desc" },
      ];
      mockMcpCatalog.findMany.mockResolvedValue(mockCatalogs);

      const result = await catalogRepository.findAll(mockDb);

      expect(result).toStrictEqual(mockCatalogs);
      expect(mockMcpCatalog.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
      });
    });

    test("カタログが存在しない場合は空配列を返す", async () => {
      mockMcpCatalog.findMany.mockResolvedValue([]);

      const result = await catalogRepository.findAll(mockDb);

      expect(result).toStrictEqual([]);
    });
  });

  describe("upsert", () => {
    const seedData: CatalogSeedData = {
      name: "Test Catalog",
      description: "テスト用カタログ",
      iconPath: "/logos/test.svg",
      transportType: "STDIO",
      command: "npx",
      args: JSON.stringify(["-y", "test-server"]),
      credentialKeys: JSON.stringify([]),
      authType: "NONE",
      isOfficial: true,
    };

    test("新規カタログを作成する", async () => {
      const mockResult = { id: 1, ...seedData };
      mockMcpCatalog.upsert.mockResolvedValue(mockResult);

      const result = await catalogRepository.upsert(mockDb, seedData);

      expect(result).toStrictEqual(mockResult);
      expect(mockMcpCatalog.upsert).toHaveBeenCalledWith({
        where: { name: seedData.name },
        update: {
          description: seedData.description,
          iconPath: seedData.iconPath,
          transportType: seedData.transportType,
          command: seedData.command,
          args: seedData.args,
          credentialKeys: seedData.credentialKeys,
          authType: seedData.authType,
          isOfficial: seedData.isOfficial,
        },
        create: seedData,
      });
    });

    test("既存カタログを更新する", async () => {
      const updatedData: CatalogSeedData = {
        ...seedData,
        description: "更新されたカタログ",
      };
      const mockResult = { id: 1, ...updatedData };
      mockMcpCatalog.upsert.mockResolvedValue(mockResult);

      const result = await catalogRepository.upsert(mockDb, updatedData);

      expect(result).toStrictEqual(mockResult);
    });
  });
});
