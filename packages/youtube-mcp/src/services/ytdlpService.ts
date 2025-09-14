import { exec } from "child_process";
import { promises as fs } from "fs";
import { promisify } from "util";
import type { TranscriptResponse, TranscriptSegment } from "@/types/index.js";

const execAsync = promisify(exec);

export class YtdlpService {
  private readonly tempDir = "/tmp";

  async checkYtdlpInstalled(): Promise<boolean> {
    try {
      await execAsync("yt-dlp --version");
      return true;
    } catch {
      return false;
    }
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

    const outputPath = `${this.tempDir}/transcript_${videoId}_${language}_${Date.now()}`;
    const command = this.buildCommand(videoId, language, outputPath);

    try {
      await execAsync(command);
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

  private buildCommand(
    videoId: string,
    language: string,
    outputPath: string,
  ): string {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return `yt-dlp --write-subs --write-auto-subs --skip-download --sub-format vtt --sub-langs ${language} "${videoUrl}" --output "${outputPath}" 2>&1`;
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
    const parts = timestamp.split(":");
    const seconds = parts[2] ? parseFloat(parts[2]) : 0;
    const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    const hours = parts[0] ? parseInt(parts[0], 10) : 0;
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
