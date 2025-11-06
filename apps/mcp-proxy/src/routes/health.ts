import { Hono } from "hono";
import type { HonoEnv } from "../types/index.js";
import { healthHandler } from "../handlers/healthHandler.js";

export const healthRoute = new Hono<HonoEnv>();

healthRoute.get("/health", healthHandler);
