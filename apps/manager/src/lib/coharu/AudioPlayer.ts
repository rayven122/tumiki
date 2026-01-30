/**
 * 音声再生クラス
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;

  /**
   * AudioContext を初期化
   */
  private async initialize(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  /**
   * ArrayBuffer から音声を再生
   */
  async play(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    this.stop();

    const audioContext = this.audioContext;
    if (!audioContext) {
      throw new Error("AudioContext is not initialized");
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const decodedAudio = await audioContext.decodeAudioData(
      audioBuffer.slice(0),
    );

    this.sourceNode = audioContext.createBufferSource();
    this.sourceNode.buffer = decodedAudio;

    if (this.gainNode) {
      this.sourceNode.connect(this.gainNode);
    }

    this.sourceNode.onended = () => {
      this.isPlaying = false;
    };

    this.sourceNode.start();
    this.isPlaying = true;
  }

  /**
   * 再生を停止
   */
  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {
        // 既に停止している場合は無視
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.isPlaying = false;
  }

  /**
   * 再生中かどうか
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
