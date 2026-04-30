import { z } from "zod";

// テナント作成の入力スキーマ
export const createTenantInputSchema = z
  .object({
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/),
    oidcType: z.enum(["KEYCLOAK", "CUSTOM"]),
    // CUSTOM の場合のみ必須
    oidcIssuer: z.string().url().optional(),
    oidcClientId: z.string().optional(),
    oidcClientSecret: z.string().optional(),
    infisicalClientId: z.string().min(1),
    infisicalClientSecret: z.string().min(1),
    infisicalProjectSlug: z.string().min(1),
    imageTag: z.string().default("latest"),
  })
  .superRefine((data, ctx) => {
    // CUSTOM OIDCの場合は追加フィールドを必須とする
    if (data.oidcType === "CUSTOM") {
      if (!data.oidcIssuer) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CUSTOM OIDCにはIssuer URLが必要です",
          path: ["oidcIssuer"],
        });
      }
      if (!data.oidcClientId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CUSTOM OIDCにはClient IDが必要です",
          path: ["oidcClientId"],
        });
      }
      if (!data.oidcClientSecret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CUSTOM OIDCにはClient Secretが必要です",
          path: ["oidcClientSecret"],
        });
      }
    }
  });

// テナント削除の入力スキーマ
export const deleteTenantInputSchema = z.object({
  id: z.string(),
});

export type CreateTenantInput = z.infer<typeof createTenantInputSchema>;
export type DeleteTenantInput = z.infer<typeof deleteTenantInputSchema>;
