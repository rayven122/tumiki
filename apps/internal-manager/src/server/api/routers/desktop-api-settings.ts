import { z } from "zod";
import { DESKTOP_API_SETTINGS_ID } from "@/lib/desktop-api-settings/constants";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const settingsInputSchema = z.object({
  organizationName: z.string().trim().max(120).nullable(),
  organizationSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
      message: "slugは小文字英数字とハイフンで指定してください",
    })
    .max(80)
    .nullable(),
  catalogEnabled: z.boolean(),
  accessRequestsEnabled: z.boolean(),
  policySyncEnabled: z.boolean(),
  auditLogSyncEnabled: z.boolean(),
});

export const defaultDesktopApiSettings = {
  id: DESKTOP_API_SETTINGS_ID,
  organizationName: null,
  organizationSlug: null,
  catalogEnabled: false,
  accessRequestsEnabled: false,
  policySyncEnabled: false,
  auditLogSyncEnabled: true,
};

export const desktopApiSettingsRouter = createTRPCRouter({
  get: adminProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.desktopApiSettings.findUnique({
      where: { id: DESKTOP_API_SETTINGS_ID },
    });

    return settings ?? defaultDesktopApiSettings;
  }),

  update: adminProcedure
    .input(settingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationName =
        input.organizationName === "" ? null : input.organizationName;
      const organizationSlug =
        input.organizationSlug === "" ? null : input.organizationSlug;

      return ctx.db.desktopApiSettings.upsert({
        where: { id: DESKTOP_API_SETTINGS_ID },
        create: {
          id: DESKTOP_API_SETTINGS_ID,
          ...input,
          organizationName,
          organizationSlug,
        },
        update: {
          ...input,
          organizationName,
          organizationSlug,
        },
      });
    }),
});
