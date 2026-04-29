// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { serve } from "@hono/node-server";
import { createServer as createHttpsServer } from "node:https";

import app from "./app.js";
import { DEFAULT_PORT } from "./shared/constants/config.js";

const port = Number(process.env.PORT) || DEFAULT_PORT;

const tlsCert = process.env.TLS_CERT;
const tlsKey = process.env.TLS_KEY;
const caCert = process.env.RAYVEN_CA_CERT;

if (tlsCert && tlsKey && caCert) {
  // mTLS サーバー起動（本番環境）
  // requestCert: true でクライアント証明書を要求
  // rejectUnauthorized: false で接続は受け入れ、/v1/auth/token ハンドラ内で証明書を検証
  serve(
    {
      fetch: app.fetch,
      port,
      createServer: createHttpsServer,
      serverOptions: {
        cert: tlsCert,
        key: tlsKey,
        ca: caCert,
        requestCert: true,
        rejectUnauthorized: false,
      },
    },
    (info) => {
      console.log(
        `[tumiki-cloud-api] mTLS server running on https://localhost:${info.port}`,
      );
    },
  );
} else {
  // HTTP サーバー起動（開発環境）
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(
      `[tumiki-cloud-api] HTTP server running on http://localhost:${info.port}`,
    );
  });
}
