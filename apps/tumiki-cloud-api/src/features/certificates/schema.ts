// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { z } from "zod";

export const enrollRequestSchema = z.object({
  /** PEM 形式の CSR */
  csr: z.string().min(1),
});

export const enrollResponseSchema = z.object({
  /** PEM 形式のクライアント証明書 */
  certificate: z.string(),
  /** PEM 形式の CA チェーン */
  caChain: z.string(),
});

export type EnrollRequest = z.infer<typeof enrollRequestSchema>;
export type EnrollResponse = z.infer<typeof enrollResponseSchema>;
