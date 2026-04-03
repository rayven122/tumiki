import { describe, test, expect, beforeEach, vi } from "vitest";

// モックの設定
vi.mock("electron", () => ({
  app: {
    getPath: (name: string) => (name === "userData" ? "/test/user/data" : "/test"),
  },
}));
vi.mock("../../../shared/db");
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
});
