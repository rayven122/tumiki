// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * Infisical Certificate Manager を使って CSR に署名し証明書を発行する
 */

import type { EnrollResponse } from "./schema.js";

type InfisicalSignResponse = {
  certificate: string;
  certificateChain: string;
};

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
        // CN は CSR から取得。org_id と一致することは呼び出し元で保証済み
        commonName: orgId,
        ttl: "8760h", // 1年
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Infisical sign failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as InfisicalSignResponse;

  return {
    certificate: data.certificate,
    caChain: data.certificateChain,
  };
};
