import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  DEFAULT_DESKTOP_API_SETTINGS_RECORD,
  DESKTOP_API_SETTINGS_ID,
} from "@/lib/desktop-api-settings/constants";
import {
  isHttpUrl,
  isLocalOrPublicHttpUrl,
  isResolvedLocalOrPublicHttpUrl,
} from "@/lib/url-safety";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const settingsInputSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .max(120)
    .transform((value) => (value === "" ? null : value))
    .nullable(),
  organizationLogoUrl: z
    .string()
    .trim()
    .max(1_000)
    .refine((value) => value === "" || isHttpUrl(value), {
      message: "ロゴURLは http:// または https:// で始まる必要があります",
    })
    .refine((value) => value === "" || isLocalOrPublicHttpUrl(value), {
      message: "ロゴURLに内部ネットワークアドレスは指定できません",
    })
    .transform((value) => (value === "" ? null : value))
    .nullable(),
});

export const desktopApiSettingsRouter = createTRPCRouter({
  get: adminProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.desktopApiSettings.findUnique({
      where: { id: DESKTOP_API_SETTINGS_ID },
    });

    return settings ?? DEFAULT_DESKTOP_API_SETTINGS_RECORD;
  }),

  update: adminProcedure
    .input(settingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (
        input.organizationLogoUrl &&
        !(await isResolvedLocalOrPublicHttpUrl(input.organizationLogoUrl))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "ロゴURLの名前解決先に内部ネットワークアドレスは指定できません",
        });
      }

      const data = {
        organizationName: input.organizationName,
        organizationLogoUrl: input.organizationLogoUrl,
      };

      return ctx.db.desktopApiSettings.upsert({
        where: { id: DESKTOP_API_SETTINGS_ID },
        create: {
          id: DESKTOP_API_SETTINGS_ID,
          ...data,
        },
        update: data,
      });
    }),
});
