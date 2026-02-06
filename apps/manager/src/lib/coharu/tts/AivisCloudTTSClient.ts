/**
 * Aivis Cloud API用TTSクライアント
 * https://api.aivis-project.com/v1/tts/synthesize
 */

import type { TTSClient, TTSOptions } from "./TTSClient";

export type AivisCloudConfig = {
  /** APIキー */
  apiKey: string;
  /** モデルUUID */
  modelUuid: string;
  /** 出力形式（wav, mp3, flac, aac, opus） */
  outputFormat?: string;
  /** APIベースURL */
  baseUrl?: string;
};

type RequiredAivisCloudConfig = Required<AivisCloudConfig>;

export class AivisCloudTTSClient implements TTSClient {
  private config: RequiredAivisCloudConfig;

  constructor(config: AivisCloudConfig) {
    this.config = {
      apiKey: config.apiKey,
      modelUuid: config.modelUuid,
      // デフォルトを mp3 に変更（MediaSource API 互換）
      outputFormat: config.outputFormat ?? "mp3",
      baseUrl: config.baseUrl ?? "https://api.aivis-project.com/v1",
    };
  }

  /**
   * 音声合成（ArrayBuffer を返す）
   */
  async synthesize(
    text: string,
    _speakerId: string,
    options?: TTSOptions,
  ): Promise<ArrayBuffer> {
    const response = await this.fetchSynthesize(text, options);
    return response.arrayBuffer();
  }

  /**
   * 音声合成（ストリーミングレスポンスを返す）
   * レート制限対策として、複数の文を連結して1リクエストで送信可能
   */
  async synthesizeStream(
    text: string,
    options?: TTSOptions,
  ): Promise<Response> {
    return this.fetchSynthesize(text, options);
  }

  /**
   * Aivis Cloud API への音声合成リクエスト
   */
  private async fetchSynthesize(
    text: string,
    options?: TTSOptions,
  ): Promise<Response> {
    const requestBody: Record<string, unknown> = {
      model_uuid: this.config.modelUuid,
      text: text,
      use_ssml: false,
      output_format: this.config.outputFormat,
      language: "ja",
    };

    // オプションがあれば追加
    if (options?.speedScale !== undefined) {
      requestBody.speed_scale = options.speedScale;
    }
    if (options?.pitchScale !== undefined) {
      requestBody.pitch_scale = options.pitchScale;
    }
    if (options?.volumeScale !== undefined) {
      requestBody.volume_scale = options.volumeScale;
    }
    if (options?.intonationScale !== undefined) {
      requestBody.intonation_scale = options.intonationScale;
    }

    const response = await fetch(`${this.config.baseUrl}/tts/synthesize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Aivis Cloud API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response;
  }

  /**
   * 出力形式を取得
   */
  getOutputFormat(): string {
    return this.config.outputFormat;
  }

  /**
   * Content-Type を取得
   */
  getContentType(): string {
    const formatMap: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      flac: "audio/flac",
      aac: "audio/aac",
      opus: "audio/opus",
    };
    return formatMap[this.config.outputFormat] ?? "audio/mpeg";
  }
}
