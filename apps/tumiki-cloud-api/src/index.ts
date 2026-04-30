// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { serve } from "@hono/node-server";
import { createServer as createHttpsServer } from "node:https";

import app from "./app.js";
import { DEFAULT_PORT } from "./shared/constants/config.js";

const port = Number(process.env.PORT) || DEFAULT_PORT;

const tlsCert = process.env.TLS_CERT;
const tlsKey = process.env.TLS_KEY;
const caCert = process.env.CA_CERT;

if (tlsCert && tlsKey && caCert) {
  // mTLS モードの場合のみ必須環境変数を検証し、不足していれば起動を失敗させる
  const requiredEnvVars = [
    "JWT_SIGNING_PRIVATE_KEY",
    "JWT_SIGNING_PUBLIC_KEY",
    "BOOTSTRAP_TOKEN_PUBLIC_KEY",
  ];
  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
  if (missingEnvVars.length > 0) {
    console.error(
      `[tumiki-cloud-api] FATAL: Missing required env vars: ${missingEnvVars.join(", ")}`,
    );
    process.exit(1);
  }

  // mTLS サーバー起動（本番環境）
  // requestCert: true でクライアント証明書を要求
  // rejectUnauthorized: false は意図的な設定: TLS レイヤーで接続を切断せず、
  // 各ハンドラ内で socket.authorized を確認して認証要否を制御する。
  // mTLS 認証が必要なエンドポイントは必ず socket.authorized チェックを実装すること。
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
