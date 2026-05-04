import { S3Client } from "@aws-sdk/client-s3";
import { db } from "@tumiki/internal-db/server";
import {
  DEFAULT_OBJECT_STORAGE_SETTINGS_RECORD,
  OBJECT_STORAGE_ENV_ALIASES,
  OBJECT_STORAGE_ENV_KEYS,
  OBJECT_STORAGE_SETTINGS_ID,
} from "./constants";
import { decryptObjectStorageSecret } from "./secret";

type ConfigSource = "database" | "environment";

export type ObjectStorageConfig = {
  source: ConfigSource;
  endpoint: string;
  region: string;
  bucket: string;
  publicBaseUrl: string | null;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

const readEnvValue = (
  key: keyof typeof OBJECT_STORAGE_ENV_KEYS,
): string | undefined => {
  const primary = process.env[OBJECT_STORAGE_ENV_KEYS[key]];
  if (primary && primary.length > 0) return primary;

  for (const alias of OBJECT_STORAGE_ENV_ALIASES[key]) {
    const value = process.env[alias];
    if (value && value.length > 0) return value;
  }

  return undefined;
};

const readEnvBoolean = (
  key: keyof typeof OBJECT_STORAGE_ENV_KEYS,
): boolean | undefined => {
  const value = readEnvValue(key);
  if (!value) return undefined;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

export const getEnvironmentObjectStorageConfig =
  (): ObjectStorageConfig | null => {
    const endpoint = readEnvValue("endpoint");
    const bucket = readEnvValue("bucket");
    const accessKeyId = readEnvValue("accessKeyId");
    const secretAccessKey = readEnvValue("secretAccessKey");

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return null;
    }

    return {
      source: "environment",
      endpoint,
      region: readEnvValue("region") ?? "auto",
      bucket,
      publicBaseUrl: readEnvValue("publicBaseUrl") ?? null,
      accessKeyId,
      secretAccessKey,
      forcePathStyle: readEnvBoolean("forcePathStyle") ?? true,
    };
  };

export const getDatabaseObjectStorageSettings = async () =>
  (await db.objectStorageSettings.findUnique({
    where: { id: OBJECT_STORAGE_SETTINGS_ID },
  })) ?? DEFAULT_OBJECT_STORAGE_SETTINGS_RECORD;

export const getResolvedObjectStorageConfig =
  async (): Promise<ObjectStorageConfig | null> => {
    const envConfig = getEnvironmentObjectStorageConfig();
    if (envConfig) return envConfig;

    const settings = await getDatabaseObjectStorageSettings();
    if (
      !settings.endpoint ||
      !settings.bucket ||
      !settings.accessKeyId ||
      !settings.encryptedSecretAccessKey
    ) {
      return null;
    }

    return {
      source: "database",
      endpoint: settings.endpoint,
      region: settings.region ?? "auto",
      bucket: settings.bucket,
      publicBaseUrl: settings.publicBaseUrl,
      accessKeyId: settings.accessKeyId,
      secretAccessKey: decryptObjectStorageSecret(
        settings.encryptedSecretAccessKey,
      ),
      forcePathStyle: settings.forcePathStyle,
    };
  };

export const createObjectStorageClient = (config: ObjectStorageConfig) =>
  new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

export const buildObjectUrl = (
  config: Pick<ObjectStorageConfig, "bucket" | "endpoint" | "publicBaseUrl">,
  objectKey: string,
): string => {
  const baseUrl =
    config.publicBaseUrl?.replace(/\/+$/, "") ??
    `${config.endpoint.replace(/\/+$/, "")}/${config.bucket}`;
  return `${baseUrl}/${objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
};
