/**
 * ストリーミング TTS プレーヤー
 * MediaSource API を使用してストリーミング音声を再生
 */

export type StreamingTTSPlayerOptions = {
  /** 再生開始時のコールバック */
  onPlayStart?: () => void;
  /** 再生終了時のコールバック */
  onPlayEnd?: () => void;
};

export class StreamingTTSPlayer {
  private audio: HTMLAudioElement | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private isPlaying = false;
  private pendingChunks: Uint8Array[] = [];
  private isSourceBufferUpdating = false;
  private streamEnded = false;
  private onPlayStart?: () => void;
  private onPlayEnd?: () => void;
  private abortController: AbortController | null = null;

  constructor(options?: StreamingTTSPlayerOptions) {
    this.onPlayStart = options?.onPlayStart;
    this.onPlayEnd = options?.onPlayEnd;
  }

  /**
   * テキストをストリーミング再生
   * @param text 読み上げるテキスト
   */
  async play(text: string): Promise<void> {
    if (!text.trim()) return;

    // 前回の再生をクリーンアップ
    this.cleanup();

    // MediaSource のサポートチェック
    if (!this.isMediaSourceSupported()) {
      // フォールバック: 通常の Audio 再生
      await this.playWithFallback(text);
      return;
    }

    // AbortController を作成
    this.abortController = new AbortController();

    try {
      // TTS API を呼び出し
      const response = await fetch("/api/coharu/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const body = response.body;
      if (!body) {
        throw new Error("Response body is null");
      }

      // ストリーミング再生を開始
      await this.streamAudio(body);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // キャンセルされた場合は無視
        return;
      }
      console.error("Streaming TTS error:", error);
      // フォールバック
      await this.playWithFallback(text);
    }
  }

  /**
   * MediaSource API がサポートされているかチェック
   */
  private isMediaSourceSupported(): boolean {
    return (
      typeof MediaSource !== "undefined" &&
      MediaSource.isTypeSupported('audio/mpeg; codecs="mp3"')
    );
  }

  /**
   * ストリーミング音声を再生
   */
  private async streamAudio(body: ReadableStream<Uint8Array>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.mediaSource = new MediaSource();
      this.audio = new Audio();
      this.audio.src = URL.createObjectURL(this.mediaSource);
      this.streamEnded = false;
      this.pendingChunks = [];
      this.isSourceBufferUpdating = false;

      this.mediaSource.addEventListener("sourceopen", async () => {
        try {
          // SourceBuffer を作成
          this.sourceBuffer = this.mediaSource!.addSourceBuffer("audio/mpeg");

          // updateend イベントで次のチャンクを追加
          this.sourceBuffer.addEventListener("updateend", () => {
            this.isSourceBufferUpdating = false;
            this.appendNextChunk();

            // ストリームが終了し、すべてのチャンクが追加された場合
            if (
              this.streamEnded &&
              this.pendingChunks.length === 0 &&
              this.mediaSource?.readyState === "open"
            ) {
              this.mediaSource.endOfStream();
            }
          });

          // ストリームを読み取る
          const reader = body.getReader();

          const readChunk = async () => {
            try {
              const { done, value } = await reader.read();

              if (done) {
                this.streamEnded = true;
                // 最後のチャンクを処理
                if (
                  this.pendingChunks.length === 0 &&
                  !this.isSourceBufferUpdating &&
                  this.mediaSource?.readyState === "open"
                ) {
                  this.mediaSource.endOfStream();
                }
                return;
              }

              // チャンクをキューに追加
              this.pendingChunks.push(value);
              this.appendNextChunk();

              // 次のチャンクを読む
              await readChunk();
            } catch (error) {
              if (error instanceof Error && error.message.includes("aborted")) {
                return;
              }
              reject(error);
            }
          };

          // 読み取り開始
          void readChunk();

          // 再生開始
          if (!this.isPlaying) {
            this.isPlaying = true;
            this.onPlayStart?.();
          }

          this.audio!.play().catch(reject);

          // 再生終了を監視
          this.audio!.onended = () => {
            this.isPlaying = false;
            this.onPlayEnd?.();
            resolve();
          };

          this.audio!.onerror = (e) => {
            this.isPlaying = false;
            this.onPlayEnd?.();
            reject(new Error(`Audio playback error: ${e}`));
          };
        } catch (error) {
          reject(error);
        }
      });

      this.mediaSource.addEventListener("error", (e) => {
        reject(new Error(`MediaSource error: ${e}`));
      });
    });
  }

  /**
   * 次のチャンクを SourceBuffer に追加
   */
  private appendNextChunk(): void {
    if (
      this.isSourceBufferUpdating ||
      this.pendingChunks.length === 0 ||
      !this.sourceBuffer
    ) {
      return;
    }

    const chunk = this.pendingChunks.shift();
    if (chunk) {
      this.isSourceBufferUpdating = true;
      try {
        // Uint8Array から新しい ArrayBuffer にコピーして型の互換性を確保
        const buffer = new ArrayBuffer(chunk.byteLength);
        new Uint8Array(buffer).set(chunk);
        this.sourceBuffer.appendBuffer(buffer);
      } catch (error) {
        console.error("Failed to append buffer:", error);
        this.isSourceBufferUpdating = false;
      }
    }
  }

  /**
   * フォールバック: 通常の Audio 再生（非ストリーミング）
   */
  private async playWithFallback(text: string): Promise<void> {
    try {
      const response = await fetch("/api/coharu/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      this.audio = new Audio(audioUrl);

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.onPlayStart?.();
      }

      return new Promise((resolve, reject) => {
        if (!this.audio) {
          reject(new Error("Audio element is null"));
          return;
        }

        this.audio.onended = () => {
          this.isPlaying = false;
          this.onPlayEnd?.();
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        this.audio.onerror = (e) => {
          this.isPlaying = false;
          this.onPlayEnd?.();
          URL.revokeObjectURL(audioUrl);
          reject(new Error(`Audio playback error: ${e}`));
        };

        this.audio.play().catch(reject);
      });
    } catch (error) {
      console.error("Fallback TTS error:", error);
      throw error;
    }
  }

  /**
   * 再生を停止してリソースをクリーンアップ
   */
  stop(): void {
    this.cleanup();
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlayEnd?.();
    }
  }

  /**
   * 内部リソースをクリーンアップ
   */
  private cleanup(): void {
    // リクエストをキャンセル
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Audio を停止
    if (this.audio) {
      this.audio.pause();
      if (this.audio.src) {
        URL.revokeObjectURL(this.audio.src);
      }
      this.audio = null;
    }

    // MediaSource をクリーンアップ
    if (this.mediaSource?.readyState === "open" && this.sourceBuffer) {
      try {
        this.mediaSource.removeSourceBuffer(this.sourceBuffer);
      } catch {
        // 既に削除されている場合は無視
      }
    }

    this.mediaSource = null;
    this.sourceBuffer = null;
    this.pendingChunks = [];
    this.streamEnded = false;
    this.isSourceBufferUpdating = false;
  }

  /**
   * 再生中かどうか
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
