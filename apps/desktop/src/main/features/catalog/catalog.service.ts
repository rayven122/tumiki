import { z } from "zod";
import type { CatalogItem } from "../../../types/catalog";
import { getDb } from "../../shared/db";
import { requestManagerApi } from "../../shared/manager-api-client";
import * as catalogRepository from "./catalog.repository";

const CATALOG_PAGE_LIMIT = 200;

const catalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  iconUrl: z.string().nullable(),
  status: z.enum(["available", "request_required", "disabled"]),
  permissions: z.object({
    read: z.boolean(),
    write: z.boolean(),
    execute: z.boolean(),
  }),
  transportType: z.enum(["STDIO", "SSE", "STREAMABLE_HTTP"]),
  authType: z.enum(["NONE", "BEARER", "API_KEY", "OAUTH"]),
  requiredCredentialKeys: z.array(z.string()),
  tools: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      description: z.string(),
      allowed: z.boolean(),
      reviewStatus: z.string().optional(),
    }),
  ),
  connectionTemplate: z.object({
    transportType: z.enum(["STDIO", "SSE", "STREAMABLE_HTTP"]),
    command: z.string().nullable(),
    args: z.array(z.string()),
    url: z.string().nullable(),
    authType: z.enum(["NONE", "BEARER", "API_KEY", "OAUTH"]),
    credentialKeys: z.array(z.string()),
  }),
}) satisfies z.ZodType<CatalogItem>;

const catalogListResponseSchema = z.object({
  items: z.array(catalogItemSchema),
  nextCursor: z.string().nullable(),
});

/**
 * Manager APIからすべてのカタログを取得
 */
export const getAllCatalogs = async (): Promise<CatalogItem[]> => {
  const items: CatalogItem[] = [];
  let cursor: string | null = null;

  do {
    const params = new URLSearchParams({ limit: String(CATALOG_PAGE_LIMIT) });
    if (cursor) params.set("cursor", cursor);

    const response = await requestManagerApi(
      `/api/desktop/v1/catalogs?${params.toString()}`,
    );
    if (!response) {
      throw new Error("管理サーバーに接続またはログインされていません");
    }
    if (!response.ok) {
      throw new Error(
        `管理サーバーのカタログ取得に失敗しました (${String(response.status)})`,
      );
    }

    const parsed = catalogListResponseSchema.parse(await response.json());
    items.push(...parsed.items);
    cursor = parsed.nextCursor;
  } while (cursor);

  return items;
};

/**
 * ローカルSQLite上のカタログを取得
 * 仮想MCP作成など、既存McpCatalog IDが必要な内部機能向け。
 */
export const getAllLocalCatalogs = async () => {
  const db = await getDb();
  return catalogRepository.findAll(db);
};
