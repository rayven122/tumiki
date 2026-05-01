import { z } from "zod";

export const AVAILABLE_FEATURES = ["dynamic-search", "pii-dashboard"] as const;

export type AvailableFeature = (typeof AVAILABLE_FEATURES)[number];

export const issueLicenseInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PERSONAL"),
    subject: z.string().email("メールアドレス形式で入力してください"),
    features: z.array(z.enum(AVAILABLE_FEATURES)).min(1),
    ttlDays: z.number().int().min(1).max(730),
    plan: z.string().optional(),
    notes: z.string().optional(),
    issuedByEmail: z.string().email().optional(),
  }),
  z.object({
    type: z.literal("TENANT"),
    subject: z.string().cuid("テナント ID の形式が正しくありません"),
    tenantId: z.string().cuid("テナント ID の形式が正しくありません"),
    features: z.array(z.enum(AVAILABLE_FEATURES)).min(1),
    ttlDays: z.number().int().min(1).max(730),
    plan: z.string().optional(),
    notes: z.string().optional(),
    issuedByEmail: z.string().email().optional(),
  }),
]);

export const listLicensesInputSchema = z.object({
  type: z.enum(["PERSONAL", "TENANT"]).optional(),
  status: z.enum(["ACTIVE", "REVOKED", "EXPIRED"]).optional(),
  tenantId: z.string().cuid().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const getLicenseInputSchema = z.object({
  id: z.string().cuid(),
});

export const revokeLicenseInputSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().optional(),
});

export type IssueLicenseInput = z.infer<typeof issueLicenseInputSchema>;
export type ListLicensesInput = z.infer<typeof listLicensesInputSchema>;
export type GetLicenseInput = z.infer<typeof getLicenseInputSchema>;
export type RevokeLicenseInput = z.infer<typeof revokeLicenseInputSchema>;
