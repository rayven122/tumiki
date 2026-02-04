/**
 * SPDX-License-Identifier: Elastic-2.0
 * This file is part of Tumiki Enterprise Edition.
 */

import { Hono } from "hono";
import type { HonoEnv } from "../types/index.js";
import { oauthTokenHandler, dcrHandler } from "./oauth.ee.js";

/**
 * OAuth 2.1 エンドポイント
 *
 * - POST /oauth/token - トークン取得・更新
 * - POST /oauth/register - Dynamic Client Registration（RFC 7591）
 */
export const oauthRoute = new Hono<HonoEnv>();

// POST /oauth/token - トークンエンドポイント
oauthRoute.post("/token", oauthTokenHandler);

// POST /oauth/register - Dynamic Client Registration エンドポイント
oauthRoute.post("/register", dcrHandler);
