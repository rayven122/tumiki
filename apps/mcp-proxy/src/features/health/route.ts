import { Hono } from "hono";
import type { HonoEnv } from "../../shared/types/honoEnv.js";
import { healthHandler } from "./handler.js";

export const healthRoute = new Hono<HonoEnv>();

healthRoute.get("/health", healthHandler);
