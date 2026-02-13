/**
 * TTS 合成 API エンドポイント
 * Aivis Cloud API へのプロキシ（API キー隠蔽）
 */

import { NextResponse } from "next/server";
import { auth } from "~/auth";
import { AivisCloudTTSClient } from "@/features/avatar/services/tts";
import type { TTSOptions } from "@/features/avatar/services/tts";

// 環境変数から設定を取得
const getConfig = () => {
  const apiKey = process.env.AIVIS_CLOUD_API_KEY;
  const modelUuid =
    process.env.AIVIS_CLOUD_MODEL_UUID ??
    "a670e6b8-0852-45b2-8704-1bc9862f2fe6";

  return { apiKey, modelUuid };
};

type TTSRequestBody = {
  text: string;
  speakerId?: string;
  options?: TTSOptions;
};

export async function POST(request: Request) {
  // 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { apiKey, modelUuid } = getConfig();

  if (!apiKey) {
    return NextResponse.json(
      { error: "TTS service is not configured" },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as TTSRequestBody;
    const { text, speakerId = "1", options } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const client = new AivisCloudTTSClient({
      apiKey,
      modelUuid,
    });

    const audioBuffer = await client.synthesize(text, speakerId, options);

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS synthesis error:", error);
    return NextResponse.json(
      { error: "Failed to synthesize speech" },
      { status: 500 },
    );
  }
}
