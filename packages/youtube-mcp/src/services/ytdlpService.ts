import { spawn } from "child_process";
import { promises as fs } from "fs";
import type { TranscriptResponse, TranscriptSegment } from "@/types/index.js";

export class YtdlpService {
  private readonly tempDir: string;

  constructor(tempDir?: string) {
    this.tempDir = tempDir ?? process.env.YTDLP_TEMP_DIR ?? "/tmp";
  }

  async checkYtdlpInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn("yt-dlp", ["--version"]);
      child.on("close", (code) => {
        resolve(code === 0);
      });
      child.on("error", () => {
        resolve(false);
      });
    });
  }

  async getTranscript(
    videoId: string,
    language: string,
    startTime?: number,
    endTime?: number,
  ): Promise<TranscriptResponse> {
    const isInstalled = await this.checkYtdlpInstalled();
    if (!isInstalled) {
      throw new Error(
        "yt-dlp is not installed. Please install it first: https://github.com/yt-dlp/yt-dlp/wiki/Installation",
      );
    }

    await this.ensureDirectoryExists();
    const outputPath = `${this.tempDir}/transcript_${videoId}_${language}_${Date.now()}`;

    try {
      await this.executeYtdlp(videoId, language, outputPath);
      const vttPath = `${outputPath}.${language}.vtt`;
      const vttContent = await fs.readFile(vttPath, "utf-8");
      await fs.unlink(vttPath).catch(() => {
        // Ignore cleanup errors
      });

      const segments = this.parseVtt(vttContent, startTime, endTime);
      return { segments };
    } catch (error) {
      if (error instanceof Error) {
        // レート制限エラー
        if (error.message.includes("HTTP Error 429")) {
          throw new Error("Rate limited by YouTube. Please try again later.");
        }
        // 字幕が存在しない
        if (error.message.includes("There are no subtitles")) {
          throw new Error(`No subtitles available for language: ${language}`);
        }
        // VTTファイルが見つからない（字幕が存在しない）
        if (
          error.message.includes("ENOENT") &&
          error.message.includes(".vtt")
        ) {
          throw new Error(`No subtitles available for language: ${language}`);
        }
        // 動画が見つからない・アクセスできない
        if (
          error.message.includes("Video unavailable") ||
          error.message.includes("ERROR: [youtube]") ||
          error.message.includes("does not exist")
        ) {
          throw new Error(
            `Video not found or unavailable (ID: ${videoId}). Please check if the video ID is correct and the video is publicly accessible.`,
          );
        }
        // ネットワークエラー
        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ETIMEDOUT") ||
          error.message.includes("ENOTFOUND")
        ) {
          throw new Error(
            "Network error occurred while fetching transcript. Please check your internet connection and try again.",
          );
        }
        // 予期しないエラーの場合、ユーザーフレンドリーなメッセージと詳細を両方含める
        throw new Error(
          `Failed to retrieve transcript: ${error.message}. Please check if the video exists and has subtitles available.`,
        );
      }
      throw error;
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  private async executeYtdlp(
    videoId: string,
    language: string,
    outputPath: string,
  ): Promise<void> {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const args = [
      "--write-subs",
      "--write-auto-subs",
      "--skip-download",
      "--sub-format",
      "vtt",
      "--sub-langs",
      language,
      "--output",
      outputPath,
      videoUrl,
    ];

    return new Promise((resolve, reject) => {
      const child = spawn("yt-dlp", args);
      let stderr = "";

      child.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `yt-dlp exited with code ${code}`));
        }
      });

      child.on("error", (error) => {
        reject(error);
      });
    });
  }

  private parseVtt(
    vttContent: string,
    startTime?: number,
    endTime?: number,
  ): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    const lines = vttContent.split("\n");
    let i = 0;

    // Skip headers
    while (i < lines.length && !lines[i]?.includes("-->")) {
      i++;
    }

    while (i < lines.length) {
      const line = lines[i];
      if (line?.includes("-->")) {
        const parts = line.split("-->");
        if (parts.length < 2) {
          i++;
          continue;
        }
        const startStr = parts[0]?.trim();
        const endStr = parts[1]?.trim();
        if (!startStr || !endStr) {
          i++;
          continue;
        }
        const start = this.parseTimestamp(startStr.split(" ")[0] ?? "");
        const end = this.parseTimestamp(endStr.split(" ")[0] ?? "");

        // Skip if outside time range
        if (startTime !== undefined && end < startTime) {
          i++;
          continue;
        }
        if (endTime !== undefined && start > endTime) {
          break;
        }

        // Collect text lines
        const textLines: string[] = [];
        i++;
        while (i < lines.length && lines[i] && !lines[i]?.includes("-->")) {
          const currentLine = lines[i];
          if (currentLine) {
            const cleanedLine = this.cleanVttText(currentLine);
            if (cleanedLine) {
              textLines.push(cleanedLine);
            }
          }
          i++;
        }

        if (textLines.length > 0) {
          segments.push({
            start,
            end,
            text: textLines.join(" "),
          });
        }
      } else {
        i++;
      }
    }

    return segments;
  }

  private parseTimestamp(timestamp: string): number {
    if (!timestamp) return 0;

    const parts = timestamp.split(":");
    const seconds = parts[2] !== undefined ? parseFloat(parts[2]) : 0;
    const minutes = parts[1] !== undefined ? parseInt(parts[1], 10) : 0;
    const hours = parts[0] !== undefined ? parseInt(parts[0], 10) : 0;

    if (isNaN(seconds) || isNaN(minutes) || isNaN(hours)) {
      return 0;
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  private cleanVttText(text: string): string {
    // Remove VTT tags and timestamps
    return text
      .replace(/<[^>]*>/g, "") // Remove HTML-like tags
      .replace(/\d{2}:\d{2}:\d{2}\.\d{3}/g, "") // Remove timestamps
      .trim();
  }
}
