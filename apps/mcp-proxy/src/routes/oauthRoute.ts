import { Hono } from "hono";
import type { HonoEnv } from "../types/index.js";
import { oauthTokenHandler } from "./oauth.js";

/**
 * OAuth 2.1 エンドポイント
 *
 * - POST /oauth/token - トークン取得・更新
 */
export const oauthRoute = new Hono<HonoEnv>();

// POST /oauth/token - トークンエンドポイント
oauthRoute.post("/token", oauthTokenHandler);
