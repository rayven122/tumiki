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

type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

// 最大ファイルサイズ: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ファイルシグネチャ（マジックバイト）定義
const FILE_SIGNATURES: Record<AllowedImageType, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header（WEBP確認は別途）
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  "image/svg+xml": [], // SVGはテキストベースのため別途検証
};

/**
 * ファイルシグネチャを検証
 * MIMEタイプのみの検証では拡張子偽装に対して脆弱なため、
 * 実際のファイル内容（マジックバイト）を確認
 */
const validateFileSignature = async (
  file: Blob,
  mimeType: string,
): Promise<boolean> => {
  // SVGはテキストベースのためシグネチャ検証をスキップ
  // 代わりにXML構造を簡易チェック
  if (mimeType === "image/svg+xml") {
    const text = await file.slice(0, 1000).text();
    const trimmed = text.trim();
    // SVGはXML宣言または<svg>タグで始まる
    return (
      trimmed.startsWith("<?xml") ||
      trimmed.startsWith("<svg") ||
      trimmed.includes("<svg")
    );
  }

  const signatures = FILE_SIGNATURES[mimeType as AllowedImageType];
  if (!signatures || signatures.length === 0) {
    return false;
  }

  // 最長のシグネチャに合わせてバイトを読み取り
  const maxLength = Math.max(...signatures.map((s) => s.length));
  const buffer = new Uint8Array(
    await file.slice(0, maxLength + 8).arrayBuffer(),
  );

  // WebPは特殊: RIFF + size(4bytes) + WEBP
  if (mimeType === "image/webp") {
    const riffMatch =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46;
    const webpMatch =
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;
    return riffMatch && webpMatch;
  }

  // 通常のシグネチャ検証
  return signatures.some((signature) =>
    signature.every((byte, index) => buffer[index] === byte),
  );
};

// ファイルバリデーションスキーマ（同期的なチェックのみ）
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "ファイルサイズは5MB以下にしてください",
    })
    .refine(
      (file) => ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType),
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

    // MIMEタイプとサイズの検証
    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.issues
        .map((issue) => issue.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // ファイルシグネチャの検証（セキュリティ強化）
    const isValidSignature = await validateFileSignature(file, file.type);
    if (!isValidSignature) {
      return NextResponse.json(
        {
          error:
            "ファイル形式が不正です。正しい画像ファイルをアップロードしてください",
        },
        { status: 400 },
      );
    }

    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!bucketName || !publicUrl) {
      return NextResponse.json(
        { error: "ストレージの設定が不完全です" },
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
    } catch (uploadError) {
      // 本番環境ではログ出力しない
      if (process.env.NODE_ENV === "development") {
        console.error("R2 upload failed:", uploadError);
      }
      return NextResponse.json(
        { error: "ファイルのアップロードに失敗しました" },
        { status: 500 },
      );
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Request processing failed:", error);
    }
    return NextResponse.json(
      { error: "リクエストの処理に失敗しました" },
      { status: 500 },
    );
  }
}
