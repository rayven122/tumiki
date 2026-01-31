import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "~/auth";
import {
  ALLOWED_IMAGE_TYPES,
  FILE_SIGNATURES,
  MAX_FILE_SIZE,
  MIME_TO_EXTENSION,
  UPLOAD_ERROR_MESSAGES,
  WEBP_BYTE_POSITIONS,
  WEBP_MAGIC_BYTES,
  type AllowedImageType,
} from "~/lib/upload";

// R2設定（固定値）
const R2_BUCKET_NAME = "tumiki";
const R2_PUBLIC_URL = "https://assets.tumiki.cloud";

/**
 * ファイルシグネチャを検証
 * MIMEタイプのみの検証では拡張子偽装に対して脆弱なため、
 * 実際のファイル内容（マジックバイト）を確認
 */
const validateFileSignature = async (
  file: Blob,
  mimeType: string,
): Promise<boolean> => {
  const signatures = FILE_SIGNATURES[mimeType as AllowedImageType];
  if (!signatures || signatures.length === 0) {
    return false;
  }

  // 最長のシグネチャに合わせてバイトを読み取り
  // WebPは12バイト必要（RIFF + size + WEBP）
  const maxLength = Math.max(
    ...signatures.map((s) => s.length),
    WEBP_BYTE_POSITIONS.WEBP_MARKER_END,
  );
  const buffer = new Uint8Array(await file.slice(0, maxLength).arrayBuffer());

  // WebPは特殊: RIFF + size(4bytes) + WEBP
  if (mimeType === "image/webp") {
    const riffMatch = WEBP_MAGIC_BYTES.RIFF.every(
      (byte, index) => buffer[index] === byte,
    );
    const webpMatch = WEBP_MAGIC_BYTES.WEBP.every(
      (byte, index) =>
        buffer[WEBP_BYTE_POSITIONS.WEBP_MARKER_START + index] === byte,
    );
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
      message: UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE,
    })
    .refine(
      (file) => ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType),
      {
        message: UPLOAD_ERROR_MESSAGES.INVALID_TYPE,
      },
    ),
  // オルグスラッグ - R2内でディレクトリ分けに使用
  orgSlug: z.string(),
  // MCPサーバーID - ファイル名に使用（同じサーバーなら上書き）
  mcpServerId: z.string(),
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
  return MIME_TO_EXTENSION[mimeType as AllowedImageType] ?? "bin";
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: UPLOAD_ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 },
    );
  }

  if (request.body === null) {
    return new Response(UPLOAD_ERROR_MESSAGES.NO_FILE, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;
    const orgSlug = formData.get("orgSlug") as string | null;
    const mcpServerId = formData.get("mcpServerId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: UPLOAD_ERROR_MESSAGES.NO_FILE },
        { status: 400 },
      );
    }

    if (!orgSlug || !mcpServerId) {
      return NextResponse.json(
        { error: UPLOAD_ERROR_MESSAGES.MISSING_PARAMS },
        { status: 400 },
      );
    }

    // MIMEタイプとサイズの検証
    const validatedFile = FileSchema.safeParse({
      file,
      orgSlug,
      mcpServerId,
    });

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
        { error: UPLOAD_ERROR_MESSAGES.INVALID_SIGNATURE },
        { status: 400 },
      );
    }

    const r2Client = getR2Client();
    // orgSlugとmcpServerIdでパスを構成（同じサーバーなら上書き、拡張子なし）
    const key = `uploads/${orgSlug}/${mcpServerId}`;

    const fileBuffer = await file.arrayBuffer();
    const uploadBody = Buffer.from(fileBuffer);

    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: uploadBody,
          ContentType: file.type,
        }),
      );

      // 公開URLを構築
      const url = `${R2_PUBLIC_URL}/${key}`;

      return NextResponse.json({ url });
    } catch (uploadError) {
      // 本番環境ではログ出力しない
      if (process.env.NODE_ENV === "development") {
        console.error("R2 upload failed:", uploadError);
      }
      return NextResponse.json(
        { error: UPLOAD_ERROR_MESSAGES.UPLOAD_FAILED },
        { status: 500 },
      );
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Request processing failed:", error);
    }
    return NextResponse.json(
      { error: UPLOAD_ERROR_MESSAGES.UPLOAD_FAILED },
      { status: 500 },
    );
  }
}
