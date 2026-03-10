import { Hono } from "hono";
import type { HonoEnv } from "../../shared/types/honoEnv.js";

export const healthRoute = new Hono<HonoEnv>();

/**
 * ヘルスチェックエンドポイント
 */
healthRoute.get("/", (c) => {
  return c.json({ status: "ok" });
});
