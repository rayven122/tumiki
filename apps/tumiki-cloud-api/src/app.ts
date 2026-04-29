// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { Hono } from "hono";
import { cors } from "hono/cors";

import { authRoute } from "./features/auth/route.js";
import { certificatesRoute } from "./features/certificates/route.js";
import { healthRoute } from "./features/health/route.js";
import { toolSearchRoute } from "./features/toolSearch/route.js";

const app = new Hono();

app.use("/*", cors());

app.route("/", healthRoute);
app.route("/", authRoute);
app.route("/", certificatesRoute);
app.route("/", toolSearchRoute);

export default app;
