import { createHash } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { Role } from "@tumiki/internal-db/server";
import { auth } from "~/auth";
import {
  buildObjectUrl,
  createObjectStorageClient,
  getResolvedObjectStorageConfig,
} from "~/lib/object-storage/config";
import {
  OBJECT_STORAGE_IMAGE_EXTENSION_BY_TYPE,
  MAX_OBJECT_STORAGE_IMAGE_SIZE_BYTES,
  OBJECT_STORAGE_UPLOAD_PREFIX_BY_PURPOSE,
} from "~/lib/object-storage/constants";

const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

const detectImageType = (
  buffer: Buffer,
): keyof typeof OBJECT_STORAGE_IMAGE_EXTENSION_BY_TYPE | null => {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const session = await auth();
  if (!session?.user?.sub) {
    return jsonError("ログインが必要です", 401);
  }
  if (session.user.role !== Role.SYSTEM_ADMIN) {
    return jsonError("SYSTEM_ADMINのみ操作できます", 403);
  }

  const config = await getResolvedObjectStorageConfig();
  if (!config) {
    return jsonError(
      "画像アップロードにはS3互換ストレージ設定が必要です。先にオブジェクトストレージ設定を保存してください。",
      503,
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const purpose = formData.get("purpose");

  if (purpose !== null && typeof purpose !== "string") {
    return jsonError("アップロード用途が不正です", 400);
  }
  const purposeKey = purpose ?? "org-logo";
  if (!(purposeKey in OBJECT_STORAGE_UPLOAD_PREFIX_BY_PURPOSE)) {
    return jsonError("アップロード用途が不正です", 400);
  }

  if (!(file instanceof Blob)) {
    return jsonError("画像ファイルを選択してください", 400);
  }
  if (file.size > MAX_OBJECT_STORAGE_IMAGE_SIZE_BYTES) {
    return jsonError("画像ファイルは512KB以下にしてください", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectImageType(buffer);
  if (!detectedType) {
    return jsonError("PNG / JPG / WebP の画像ファイルを選択してください", 400);
  }
  const extension = OBJECT_STORAGE_IMAGE_EXTENSION_BY_TYPE[detectedType];

  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  const prefix =
    OBJECT_STORAGE_UPLOAD_PREFIX_BY_PURPOSE[
      purposeKey as keyof typeof OBJECT_STORAGE_UPLOAD_PREFIX_BY_PURPOSE
    ];
  const key = `${prefix}/${purposeKey}-${hash}.${extension}`;

  try {
    await createObjectStorageClient(config).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: detectedType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    console.error(
      "オブジェクトストレージへのアップロードに失敗しました:",
      error,
    );
    return jsonError("画像ファイルの保存に失敗しました", 500);
  }

  return NextResponse.json({
    objectKey: key,
    url: buildObjectUrl(config, key),
    source: config.source,
  });
};
