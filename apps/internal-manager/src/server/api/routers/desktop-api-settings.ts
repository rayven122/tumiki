import { z } from "zod";
import {
  DEFAULT_DESKTOP_API_SETTINGS,
  DESKTOP_API_SETTINGS_ID,
} from "@/lib/desktop-api-settings/constants";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const settingsInputSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .max(120)
    .transform((value) => (value === "" ? null : value))
    .nullable(),
  organizationSlug: z
    .string()
    .trim()
    .max(80)
    .refine(
      (value) => value === "" || /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value),
      {
        message: "slugは小文字英数字とハイフンで指定してください",
      },
    )
    .transform((value) => (value === "" ? null : value))
    .nullable(),
  catalogEnabled: z.boolean(),
  accessRequestsEnabled: z.boolean(),
  policySyncEnabled: z.boolean(),
  auditLogSyncEnabled: z.boolean(),
});

export const desktopApiSettingsRouter = createTRPCRouter({
  get: adminProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.desktopApiSettings.findUnique({
      where: { id: DESKTOP_API_SETTINGS_ID },
    });

    return settings ?? DEFAULT_DESKTOP_API_SETTINGS;
  }),

  update: adminProcedure
    .input(settingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.desktopApiSettings.upsert({
        where: { id: DESKTOP_API_SETTINGS_ID },
        create: {
          id: DESKTOP_API_SETTINGS_ID,
          organizationName: input.organizationName,
          organizationSlug: input.organizationSlug,
          catalogEnabled: input.catalogEnabled,
          accessRequestsEnabled: input.accessRequestsEnabled,
          policySyncEnabled: input.policySyncEnabled,
          auditLogSyncEnabled: input.auditLogSyncEnabled,
        },
        update: {
          organizationName: input.organizationName,
          organizationSlug: input.organizationSlug,
          catalogEnabled: input.catalogEnabled,
          accessRequestsEnabled: input.accessRequestsEnabled,
          policySyncEnabled: input.policySyncEnabled,
          auditLogSyncEnabled: input.auditLogSyncEnabled,
        },
      });
    }),
});
