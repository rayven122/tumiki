// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { Hono } from "hono";

import { dynamicSearchRoute } from "./features/dynamicSearch/route.js";
import { healthRoute } from "./features/health/route.js";
import { toolSearchEmbeddingsRoute } from "./features/toolSearchEmbeddings/route.js";

const app = new Hono();

app.route("/", healthRoute);
app.route("/", dynamicSearchRoute);
app.route("/", toolSearchEmbeddingsRoute);

export default app;
