/**
 * TTS 合成 API エンドポイント
 * Aivis Cloud API へのストリーミングプロキシ（API キー隠蔽）
 */

import { NextResponse } from "next/server";
import { auth } from "~/auth";
import { AivisCloudTTSClient } from "@/lib/coharu/tts";
import type { TTSOptions } from "@/lib/coharu/tts";

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
    const { text, options } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const client = new AivisCloudTTSClient({
      apiKey,
      modelUuid,
    });

    // ストリーミングレスポンスを取得
    const response = await client.synthesizeStream(text, options);

    // レスポンスボディがない場合はエラー
    if (!response.body) {
      return NextResponse.json(
        { error: "Failed to get audio stream" },
        { status: 500 },
      );
    }

    // ストリーミングレスポンスをそのまま転送
    return new Response(response.body, {
      headers: {
        "Content-Type": client.getContentType(),
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
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
