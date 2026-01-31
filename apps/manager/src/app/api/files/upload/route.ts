import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";

import { auth } from "~/auth";

// サポートする画像形式
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
] as const;

// 最大ファイルサイズ: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ファイルバリデーションスキーマ
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "ファイルサイズは5MB以下にしてください",
    })
    .refine(
      (file) =>
        ALLOWED_IMAGE_TYPES.includes(
          file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
        ),
      {
        message: "JPEG、PNG、WebP、SVG、GIF形式の画像のみアップロードできます",
      },
    ),
});

// R2クライアントの初期化
const getR2Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2の環境変数が設定されていません");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

// ファイル拡張子を取得
const getFileExtension = (mimeType: string): string => {
  const extensionMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/gif": "gif",
  };
  return extensionMap[mimeType] ?? "bin";
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.issues
        .map((issue) => issue.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!bucketName || !publicUrl) {
      return NextResponse.json(
        { error: "R2の設定が不完全です" },
        { status: 500 },
      );
    }

    const r2Client = getR2Client();
    const fileBuffer = await file.arrayBuffer();
    const extension = getFileExtension(file.type);
    const key = `uploads/${nanoid()}.${extension}`;

    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: Buffer.from(fileBuffer),
          ContentType: file.type,
        }),
      );

      // 公開URLを構築
      const url = `${publicUrl.replace(/\/$/, "")}/${key}`;

      return NextResponse.json({ url });
    } catch (_error) {
      console.error("R2 upload failed:", _error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
