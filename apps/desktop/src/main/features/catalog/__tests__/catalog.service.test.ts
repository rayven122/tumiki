import { describe, test, expect, beforeEach, vi } from "vitest";

// モックの設定
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../catalog.repository");

// テスト対象のインポート（モックの後に行う）
import * as catalogService from "../catalog.service";
import { getDb } from "../../../shared/db";
import * as catalogRepository from "../catalog.repository";

describe("catalog.service", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("getAllCatalogs", () => {
    test("すべてのカタログを取得する", async () => {
      const mockCatalogs = [
        { id: 1, name: "A Catalog" },
        { id: 2, name: "B Catalog" },
      ];
      vi.mocked(catalogRepository.findAll).mockResolvedValue(
        mockCatalogs as Awaited<ReturnType<typeof catalogRepository.findAll>>,
      );

      const result = await catalogService.getAllCatalogs();

      expect(result).toStrictEqual(mockCatalogs);
      expect(catalogRepository.findAll).toHaveBeenCalledWith(mockDb);
    });
  });

  describe("seedCatalogs", () => {
    test("すべてのシードデータをupsertする", async () => {
      vi.mocked(catalogRepository.upsert).mockResolvedValue(
        {} as Awaited<ReturnType<typeof catalogRepository.upsert>>,
      );

      await catalogService.seedCatalogs();

      // CATALOG_SEEDSの件数分upsertが呼ばれる（7件）
      expect(catalogRepository.upsert).toHaveBeenCalledTimes(7);
      // 最初の呼び出しを検証
      expect(catalogRepository.upsert).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ name: "Filesystem STDIO" }),
      );
    });
  });
});
