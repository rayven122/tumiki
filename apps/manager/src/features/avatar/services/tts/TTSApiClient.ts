/**
 * フロントエンド用TTSクライアント
 * サーバーサイドの /api/coharu/tts エンドポイント経由で音声合成を行う
 * APIキーを隠蔽するためにサーバーを経由する
 */

import type { TTSClient, TTSOptions } from "./TTSClient";

export type TTSApiClientConfig = {
  /** APIベースURL（デフォルト: 空文字 = 相対パス） */
  baseUrl?: string;
};

/**
 * サーバーAPI経由のTTSクライアント
 * フロントエンドから使用する
 */
export class TTSApiClient implements TTSClient {
  private baseUrl: string;

  constructor(config?: TTSApiClientConfig) {
    this.baseUrl = config?.baseUrl ?? "";
  }

  async synthesize(
    text: string,
    speakerId: string,
    options?: TTSOptions,
  ): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/api/coharu/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        speakerId,
        options,
      }),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => ({}));
      const error =
        typeof errorData === "object" && errorData !== null
          ? (errorData as { error?: string })
          : {};
      throw new Error(
        error.error ??
          `TTS API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.arrayBuffer();
  }
}
