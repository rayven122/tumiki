/**
 * Hono アプリケーション定義
 *
 * ルートマウントとCORS設定を担当
 */

import { Hono } from "hono";
import { cors } from "hono/cors";

import type { HonoEnv } from "./shared/types/honoEnv.js";
import { healthRoute } from "./features/health/route.js";
import { mcpFeatureRoute } from "./features/mcp/route.js";
import { oauthRoute } from "./features/oauth/route.js";
import { wellKnownRoute } from "./features/oauth/queries/wellKnown/route.js";

// Hono アプリケーションの作成
const app = new Hono<HonoEnv>();

// CORS設定
app.use("/*", cors());

// ルート設定
app.route("/", healthRoute);
app.route("/", mcpFeatureRoute);
app.route("/.well-known", wellKnownRoute);
app.route("/oauth", oauthRoute);

export default app;
