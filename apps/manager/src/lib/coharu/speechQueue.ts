/**
 * 音声合成キュー管理
 * ストリーミングレスポンス用の音声キュー
 */

import { AudioPlayer } from "./AudioPlayer";
import { TTSApiClient } from "./tts";

export type SpeechQueueOptions = {
  /** 再生開始時のコールバック */
  onPlayStart?: () => void;
  /** 再生終了時のコールバック */
  onPlayEnd?: () => void;
};

export class SpeechQueue {
  private queue: string[] = [];
  private isProcessing = false;
  private audioPlayer: AudioPlayer;
  private ttsClient: TTSApiClient;
  private onPlayStart?: () => void;
  private onPlayEnd?: () => void;
  private isPlaying = false;

  constructor(options?: SpeechQueueOptions) {
    this.onPlayStart = options?.onPlayStart;
    this.onPlayEnd = options?.onPlayEnd;
    this.audioPlayer = new AudioPlayer();
    this.ttsClient = new TTSApiClient();
  }

  /**
   * テキストをキューに追加
   */
  async enqueue(text: string): Promise<void> {
    if (!text.trim()) return;

    this.queue.push(text);
    await this.processQueue();
  }

  /**
   * キューを処理
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const text = this.queue[0];
      if (!text) break;

      try {
        // 音声合成
        const audioBuffer = await this.ttsClient.synthesize(text, "1");

        // 再生開始
        if (!this.isPlaying) {
          this.isPlaying = true;
          this.onPlayStart?.();
        }

        // 再生
        await this.audioPlayer.play(audioBuffer);

        // 再生完了を待機
        await this.waitForPlayback();

        // キューから削除
        this.queue.shift();
      } catch (error) {
        console.error("Speech synthesis error:", error);
        // エラー時はスキップ
        this.queue.shift();
      }
    }

    // 全ての再生が完了
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlayEnd?.();
    }

    this.isProcessing = false;
  }

  /**
   * 再生完了を待機
   */
  private waitForPlayback(): Promise<void> {
    return new Promise((resolve) => {
      const checkPlayback = () => {
        if (!this.audioPlayer.getIsPlaying()) {
          resolve();
        } else {
          setTimeout(checkPlayback, 100);
        }
      };
      setTimeout(checkPlayback, 100);
    });
  }

  /**
   * キューをクリア
   */
  clear(): void {
    this.queue = [];
    this.audioPlayer.stop();
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlayEnd?.();
    }
  }
}
