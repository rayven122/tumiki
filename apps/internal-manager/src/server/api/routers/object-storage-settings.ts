import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getEnvironmentObjectStorageConfig,
  getDatabaseObjectStorageSettings,
} from "~/lib/object-storage/config";
import { OBJECT_STORAGE_SETTINGS_ID } from "~/lib/object-storage/constants";
import { encryptObjectStorageSecret } from "~/lib/object-storage/secret";
import {
  isHttpUrl,
  isLocalOrPublicHttpUrl,
  isResolvedLocalOrPublicHttpUrl,
} from "~/lib/url-safety";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable();

const settingsInputSchema = z.object({
  endpoint: optionalString(500)
    .refine((value) => value === null || isHttpUrl(value), {
      message: "Endpoint は http:// または https:// で入力してください",
    })
    .refine((value) => value === null || isLocalOrPublicHttpUrl(value), {
      message: "Endpoint に内部ネットワークアドレスは指定できません",
    }),
  region: optionalString(100),
  bucket: optionalString(120),
  publicBaseUrl: optionalString(500)
    .refine((value) => value === null || isHttpUrl(value), {
      message: "公開URL は http:// または https:// で入力してください",
    })
    .refine((value) => value === null || isLocalOrPublicHttpUrl(value), {
      message: "公開URL に内部ネットワークアドレスは指定できません",
    }),
  accessKeyId: optionalString(200),
  secretAccessKey: z
    .string()
    .max(500)
    .transform((value) => (value.trim() === "" ? undefined : value.trim()))
    .optional(),
  forcePathStyle: z.boolean(),
});

export const objectStorageSettingsRouter = createTRPCRouter({
  get: adminProcedure.query(async () => {
    const envConfig = getEnvironmentObjectStorageConfig();
    const settings = await getDatabaseObjectStorageSettings();

    return {
      source: envConfig ? "environment" : "database",
      isConfigured: Boolean(
        envConfig ??
        (settings.endpoint &&
          settings.bucket &&
          settings.accessKeyId &&
          settings.encryptedSecretAccessKey),
      ),
      environmentConfigured: Boolean(envConfig),
      endpoint: settings.endpoint,
      region: settings.region,
      bucket: settings.bucket,
      publicBaseUrl: settings.publicBaseUrl,
      accessKeyId: settings.accessKeyId,
      hasSecretAccessKey: Boolean(settings.encryptedSecretAccessKey),
      forcePathStyle: settings.forcePathStyle,
    };
  }),

  update: adminProcedure
    .input(settingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (
        input.endpoint &&
        !(await isResolvedLocalOrPublicHttpUrl(input.endpoint))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Endpoint の名前解決先に内部ネットワークアドレスは指定できません",
        });
      }

      const current = await ctx.db.objectStorageSettings.findUnique({
        where: { id: OBJECT_STORAGE_SETTINGS_ID },
      });
      const encryptedSecretAccessKey =
        input.secretAccessKey !== undefined
          ? encryptObjectStorageSecret(input.secretAccessKey)
          : (current?.encryptedSecretAccessKey ?? null);

      return ctx.db.objectStorageSettings.upsert({
        where: { id: OBJECT_STORAGE_SETTINGS_ID },
        create: {
          id: OBJECT_STORAGE_SETTINGS_ID,
          endpoint: input.endpoint,
          region: input.region,
          bucket: input.bucket,
          publicBaseUrl: input.publicBaseUrl,
          accessKeyId: input.accessKeyId,
          encryptedSecretAccessKey,
          forcePathStyle: input.forcePathStyle,
        },
        update: {
          endpoint: input.endpoint,
          region: input.region,
          bucket: input.bucket,
          publicBaseUrl: input.publicBaseUrl,
          accessKeyId: input.accessKeyId,
          encryptedSecretAccessKey,
          forcePathStyle: input.forcePathStyle,
        },
      });
    }),
});
