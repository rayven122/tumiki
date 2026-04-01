import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from "vitest";
import type { PrismaClient } from "@prisma/desktop-client";
import * as catalogRepository from "../catalog.repository";
import type { CatalogSeedData } from "../catalog.repository";
import { join } from "path";
import {
  createTestDb,
  cleanupTestDb,
} from "../../../shared/test-helpers/test-db";

const TEST_DB_PATH = join(__dirname, "test-catalog.db");

let db: PrismaClient;

beforeAll(async () => {
  db = await createTestDb(TEST_DB_PATH);
});

beforeEach(async () => {
  await db.mcpCatalog.deleteMany();
});

afterAll(async () => {
  await cleanupTestDb(db, TEST_DB_PATH);
});

const seedData: CatalogSeedData = {
  name: "Test Catalog",
  description: "テスト用カタログ",
  iconPath: "/logos/test.svg",
  transportType: "STDIO",
  command: "npx",
  args: ["-y", "test-server"],
  credentialKeys: [],
  authType: "NONE",
  isOfficial: true,
};

describe("catalog.repository（実DB）", () => {
  describe("findAll", () => {
    test("カタログが存在しない場合は空配列を返す", async () => {
      const result = await catalogRepository.findAll(db);
      expect(result).toStrictEqual([]);
    });

    test("名前の昇順ですべてのカタログを取得する", async () => {
      await catalogRepository.upsert(db, { ...seedData, name: "B Catalog" });
      await catalogRepository.upsert(db, { ...seedData, name: "A Catalog" });

      const result = await catalogRepository.findAll(db);

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe("A Catalog");
      expect(result[1]!.name).toBe("B Catalog");
    });
  });

  describe("upsert", () => {
    test("新規カタログを作成する", async () => {
      const result = await catalogRepository.upsert(db, seedData);

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Test Catalog");
      expect(result.description).toBe("テスト用カタログ");
      expect(result.authType).toBe("NONE");
      expect(result.isOfficial).toBe(true);
    });

    test("同名のカタログが存在する場合は更新する", async () => {
      await catalogRepository.upsert(db, seedData);

      const updated = await catalogRepository.upsert(db, {
        ...seedData,
        description: "更新された説明",
      });

      expect(updated.description).toBe("更新された説明");

      const all = await catalogRepository.findAll(db);
      expect(all).toHaveLength(1);
    });

    test("複数のカタログを作成できる", async () => {
      await catalogRepository.upsert(db, seedData);
      await catalogRepository.upsert(db, {
        ...seedData,
        name: "Another Catalog",
        authType: "API_KEY",
      });

      const all = await catalogRepository.findAll(db);
      expect(all).toHaveLength(2);
    });
  });
});
