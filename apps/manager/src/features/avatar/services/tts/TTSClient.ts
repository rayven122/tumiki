/**
 * TTS（Text-to-Speech）クライアントの共通インターフェース
 * Aivis Cloud API に対応
 */

/**
 * 音声合成オプション
 */
export type TTSOptions = {
  /** 話速（0.5〜2.0、デフォルト: 1.0） */
  speedScale?: number;
  /** ピッチ（-0.15〜0.15、デフォルト: 0.0） */
  pitchScale?: number;
  /** 音量（0〜2.0、デフォルト: 1.0） */
  volumeScale?: number;
  /** 抑揚（0〜2.0、デフォルト: 1.0） */
  intonationScale?: number;
};

/**
 * TTSクライアントインターフェース
 */
export type TTSClient = {
  /**
   * テキストを音声に変換
   * @param text 変換するテキスト
   * @param speakerId 話者ID
   * @param options 音声合成オプション
   * @returns 音声データ（ArrayBuffer）
   */
  synthesize(
    text: string,
    speakerId: string,
    options?: TTSOptions,
  ): Promise<ArrayBuffer>;
};
