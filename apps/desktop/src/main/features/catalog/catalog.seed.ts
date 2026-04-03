import { getDb } from "../../shared/db";
import * as catalogRepository from "./catalog.repository";
import { CATALOG_SEEDS } from "./seed-data";
import * as logger from "../../shared/utils/logger";

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
