// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { Hono } from "hono";

import { certificatesRoute } from "./features/certificates/route.js";
import { healthRoute } from "./features/health/route.js";

// このAPIはサーバー間通信専用のため CORS 設定は不要
const app = new Hono();

app.route("/", healthRoute);
app.route("/", certificatesRoute);

export default app;
