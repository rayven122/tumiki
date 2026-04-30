// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";

export const enrollRequestSchema = z.object({
  /** PEM 形式の CSR */
  csr: z
    .string()
    .min(1)
    .refine(
      (v) => {
        const trimmed = v.trim();
        return (
          trimmed.startsWith("-----BEGIN CERTIFICATE REQUEST-----") &&
          trimmed.endsWith("-----END CERTIFICATE REQUEST-----")
        );
      },
      { message: "CSR must be PEM-encoded" },
    ),
});

export type EnrollRequest = z.infer<typeof enrollRequestSchema>;

/** 証明書発行レスポンス */
export type EnrollResponse = {
  /** PEM 形式のクライアント証明書 */
  certificate: string;
  /** PEM 形式の CA チェーン */
  caChain: string;
};
