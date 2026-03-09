import { Hono } from "hono";
import type { HonoEnv } from "../../shared/types/honoEnv.js";
import { processPool } from "../../infrastructure/process/processPool.js";

export const statusRoute = new Hono<HonoEnv>();

/**
 * プロセスプール状態エンドポイント
 */
statusRoute.get("/", (c) => {
  return c.json(processPool.getStatus());
});
