export const OBJECT_STORAGE_SETTINGS_ID = "default";
export const MAX_OBJECT_STORAGE_IMAGE_SIZE_BYTES = 512 * 1024;
export const ALLOWED_OBJECT_STORAGE_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const OBJECT_STORAGE_IMAGE_EXTENSION_BY_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const satisfies Record<
  (typeof ALLOWED_OBJECT_STORAGE_IMAGE_TYPES)[number],
  string
>;

export const OBJECT_STORAGE_UPLOAD_PREFIX_BY_PURPOSE = {
  "org-logo": "org-assets",
  "connector-icon": "connector-assets",
} as const;

export const OBJECT_STORAGE_ENV_KEYS = {
  endpoint: "OBJECT_STORAGE_ENDPOINT",
  region: "OBJECT_STORAGE_REGION",
  bucket: "OBJECT_STORAGE_BUCKET",
  publicBaseUrl: "OBJECT_STORAGE_PUBLIC_BASE_URL",
  accessKeyId: "OBJECT_STORAGE_ACCESS_KEY_ID",
  secretAccessKey: "OBJECT_STORAGE_SECRET_ACCESS_KEY",
  forcePathStyle: "OBJECT_STORAGE_FORCE_PATH_STYLE",
} as const;

export const OBJECT_STORAGE_ENV_ALIASES = {
  endpoint: ["S3_ENDPOINT", "MINIO_ENDPOINT"],
  region: ["S3_REGION", "MINIO_REGION"],
  bucket: ["S3_BUCKET", "MINIO_BUCKET"],
  publicBaseUrl: ["S3_PUBLIC_BASE_URL", "MINIO_PUBLIC_BASE_URL"],
  accessKeyId: ["S3_ACCESS_KEY_ID", "MINIO_ACCESS_KEY"],
  secretAccessKey: ["S3_SECRET_ACCESS_KEY", "MINIO_SECRET_KEY"],
  forcePathStyle: ["S3_FORCE_PATH_STYLE", "MINIO_FORCE_PATH_STYLE"],
} as const;

export const DEFAULT_OBJECT_STORAGE_SETTINGS_RECORD = {
  id: OBJECT_STORAGE_SETTINGS_ID,
  endpoint: null,
  region: null,
  bucket: null,
  publicBaseUrl: null,
  accessKeyId: null,
  encryptedSecretAccessKey: null,
  forcePathStyle: true,
} as const;
