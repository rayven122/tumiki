import { getDb } from "../../shared/db";
import * as catalogRepository from "./catalog.repository";

/**
 * すべてのカタログを取得
 */
export const getAllCatalogs = async () => {
  const db = await getDb();
  return catalogRepository.findAll(db);
};
