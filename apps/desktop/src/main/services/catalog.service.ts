import { getDb } from "../db";
import * as catalogRepository from "../repositories/catalog.repository";
import { CATALOG_SEEDS } from "../db/seed";
import * as logger from "../utils/logger";

/**
 * すべてのカタログを取得
 */
export const getAllCatalogs = async () => {
  const db = await getDb();
  return catalogRepository.findAll(db);
};

/**
 * カタログシードデータをDBにupsert（冪等）
 */
export const seedCatalogs = async (): Promise<void> => {
  const db = await getDb();

  for (const seed of CATALOG_SEEDS) {
    await catalogRepository.upsert(db, seed);
  }

  logger.info(`Seeded ${CATALOG_SEEDS.length} MCP catalog entries`);
};
