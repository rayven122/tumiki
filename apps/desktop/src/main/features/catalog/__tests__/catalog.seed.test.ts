import { describe, test, expect, beforeEach, vi } from "vitest";

// モックの設定
vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../catalog.repository");

// テスト対象のインポート（モックの後に行う）
import { seedCatalogs } from "../catalog.seed";
import { getDb } from "../../../shared/db";
import * as catalogRepository from "../catalog.repository";

describe("catalog.seed", () => {
  const mockDb = {} as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("seedCatalogs", () => {
    test("すべてのシードデータをupsertする", async () => {
      vi.mocked(catalogRepository.upsert).mockResolvedValue(
        {} as Awaited<ReturnType<typeof catalogRepository.upsert>>,
      );

      await seedCatalogs();

      // CATALOG_SEEDSの件数分upsertが呼ばれる（2件）
      expect(catalogRepository.upsert).toHaveBeenCalledTimes(2);
      // 最初の呼び出しを検証
      expect(catalogRepository.upsert).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ name: "Filesystem STDIO" }),
      );
    });
  });
});
