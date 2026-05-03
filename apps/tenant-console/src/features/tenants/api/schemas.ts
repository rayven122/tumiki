import { z } from "zod";

// テナント作成の入力スキーマ
// Phase 1: Infisical 操作は自動化されたため、Client ID/Secret/projectSlug の入力を廃止
// CUSTOM OIDC の場合のみユーザーが OIDC 値を入力する（KEYCLOAK は Phase 2 で自動化予定）
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
    oidcIssuer: z.string().url().optional(),
    oidcClientId: z.string().optional(),
    oidcClientSecret: z.string().optional(),
    oidcDesktopClientId: z.string().optional(),
    imageTag: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9._-]+$/)
      .default("main"),
  })
  .superRefine((data, ctx) => {
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
      if (!data.oidcDesktopClientId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CUSTOM OIDCにはDesktop Client IDが必要です",
          path: ["oidcDesktopClientId"],
        });
      }
    }
    if (data.oidcType === "KEYCLOAK") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "KEYCLOAK 自動連携は未実装です。CUSTOM を選択して OIDC 情報を直接入力してください",
        path: ["oidcType"],
      });
    }
  });

export const deleteTenantInputSchema = z.object({
  id: z.string().cuid(),
});

export const getTenantInputSchema = z.object({
  id: z.string().cuid(),
});

export type CreateTenantInput = z.infer<typeof createTenantInputSchema>;
export type DeleteTenantInput = z.infer<typeof deleteTenantInputSchema>;
export type GetTenantInput = z.infer<typeof getTenantInputSchema>;
