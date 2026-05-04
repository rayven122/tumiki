import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";

const SETTINGS_ID = "default";

const settingsInputSchema = z.object({
  organizationName: z.string().trim().max(120).nullable(),
  organizationSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*$/, {
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
  id: SETTINGS_ID,
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
      where: { id: SETTINGS_ID },
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
        where: { id: SETTINGS_ID },
        create: {
          id: SETTINGS_ID,
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
