import { z } from "zod";

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
    /** Keycloak 利用時の初期管理者メールアドレス */
    initialAdminEmail: z.string().email().optional(),
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
    // KEYCLOAK の場合は初期管理者メールアドレスが必須
    if (data.oidcType === "KEYCLOAK" && !data.initialAdminEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Keycloak 利用時は初期管理者メールアドレスが必要です",
        path: ["initialAdminEmail"],
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
