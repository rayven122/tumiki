import { z } from "zod";

// テナント作成の入力スキーマ
export const createTenantInputSchema = z
  .object({
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
        message:
          "slug は DNS RFC1123 形式（小文字英数字とハイフンのみ、先頭末尾は英数字）でなければなりません",
      }),
    oidcType: z.enum(["KEYCLOAK", "CUSTOM"]),
    // CUSTOM の場合のみ必須
    oidcIssuer: z.string().url().optional(),
    oidcClientId: z.string().optional(),
    oidcClientSecret: z.string().optional(),
    infisicalClientId: z.string().min(1),
    infisicalClientSecret: z.string().min(1),
    infisicalProjectSlug: z.string().min(1),
    // Docker imageタグとして有効な文字のみ許可
    imageTag: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9._-]+$/)
      .default("latest"),
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
  id: z.string().cuid(),
});

export type CreateTenantInput = z.infer<typeof createTenantInputSchema>;
export type DeleteTenantInput = z.infer<typeof deleteTenantInputSchema>;
