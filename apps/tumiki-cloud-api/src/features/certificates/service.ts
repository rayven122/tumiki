// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";
import { TIMEOUT_CONFIG } from "../../shared/constants/config.js";
import type { EnrollResponse } from "./schema.js";

// Infisical は { certificate, certificateChain } を返すため caChain にマッピングする
const infisicalSignResponseSchema = z
  .object({ certificate: z.string(), certificateChain: z.string() })
  .transform((v) => ({
    certificate: v.certificate,
    caChain: v.certificateChain,
  }));

export const signCertificate = async (
  csr: string,
  orgId: string,
): Promise<EnrollResponse> => {
  const infisicalUrl = process.env.INFISICAL_URL;
  const infisicalToken = process.env.INFISICAL_API_TOKEN;
  const caId = process.env.INFISICAL_CA_ID;

  if (!infisicalUrl || !infisicalToken || !caId) {
    throw new Error("Infisical configuration is missing");
  }

  // デフォルト 90 日（環境変数で上書き可）
  const certTtl = process.env.CERT_TTL ?? "2160h";
  // Infisical TTL 形式（数値 + 時間単位 s/m/h/d/w）を検証
  if (!/^\d+[smhdw]$/.test(certTtl)) {
    throw new Error(
      `Invalid CERT_TTL format: "${certTtl}". Expected format: e.g., "2160h", "90d"`,
    );
  }

  const response = await fetch(
    `${infisicalUrl}/api/v1/pki/ca/${caId}/sign-certificate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${infisicalToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        csr,
        commonName: orgId,
        ttl: certTtl,
      }),
      signal: AbortSignal.timeout(TIMEOUT_CONFIG.certificateEnroll),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    // レスポンス本文に内部情報が含まれる可能性があるため先頭 200 文字に制限
    console.error(
      `[certificates/service] Infisical sign failed: ${response.status}`,
      text.slice(0, 200),
    );
    throw new Error("Certificate signing failed");
  }

  const raw: unknown = await response.json();
  return infisicalSignResponseSchema.parse(raw);
};
