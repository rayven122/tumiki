import { spawn } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { TranscriptResponse, TranscriptSegment } from "@/types/index.js";
import { parse as parseVtt } from "@plussub/srt-vtt-parser";

// Result type for error handling
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type TranscriptError =
  | { type: "NOT_INSTALLED"; message: string }
  | { type: "RATE_LIMITED"; message: string }
  | { type: "NO_SUBTITLES"; message: string }
  | { type: "VIDEO_UNAVAILABLE"; message: string }
  | { type: "NETWORK_ERROR"; message: string }
  | { type: "UNKNOWN"; message: string };

type VttParsedResult = {
  entries: { id: string; from: number; to: number; text: string }[];
};

export class YtdlpService {
  constructor() {
    // Service handles temporary file operations internally
  }

  async checkYtdlpInstalled(): Promise<Result<void, TranscriptError>> {
    const isInstalled = await new Promise<boolean>((resolve) => {
      const child = spawn("yt-dlp", ["--version"]);
      child.on("close", (code) => {
        resolve(code === 0);
      });
      child.on("error", () => {
        resolve(false);
      });
    });

    if (!isInstalled) {
      return {
        ok: false,
        error: {
          type: "NOT_INSTALLED",
          message:
            "yt-dlp is not installed. Please install it first: https://github.com/yt-dlp/yt-dlp/wiki/Installation",
        },
      };
    }

    return { ok: true, value: undefined };
  }

  async getTranscript(
    videoId: string,
    language: string,
    startTime?: number,
    endTime?: number,
  ): Promise<TranscriptResponse> {
    // Check yt-dlp installation
    const installResult = await this.checkYtdlpInstalled();
    if (!installResult.ok) {
      throw new Error(installResult.error.message);
    }

    // Validate video ID
    const videoIdResult = this.validateVideoId(videoId);
    if (!videoIdResult.ok) {
      throw new Error(videoIdResult.error.message);
    }

    // Validate language code
    const languageResult = this.validateLanguageCode(language);
    if (!languageResult.ok) {
      throw new Error(languageResult.error.message);
    }

    // Create temp directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "yt-dlp-"));
    const tempFilename = `subtitle_${crypto.randomBytes(8).toString("hex")}`;
    const outputPath = path.join(tempDir, tempFilename);

    try {
      const downloadResult = await this.downloadSubtitleWithYtdlp(
        videoId,
        languageResult.value,
        outputPath,
      );
      if (!downloadResult.ok) {
        throw new Error(downloadResult.error.message);
      }

      // Parse VTT content
      const vttContent = fs.readFileSync(downloadResult.value, "utf-8");
      const parsed = parseVtt(vttContent) as VttParsedResult;

      // Convert to our segment format
      const segments = this.mapParsedEntriesToSegments(
        parsed,
        startTime,
        endTime,
      );

      return { segments };
    } finally {
      // Clean up temp directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  mapParsedEntriesToSegments(
    parsed: VttParsedResult,
    startTime?: number,
    endTime?: number,
  ): TranscriptSegment[] {
    return parsed.entries
      .filter((entry) => {
        const entryStart = entry.from / 1000; // Convert ms to seconds
        const entryEnd = entry.to / 1000;

        // Filter by time range if specified
        if (startTime !== undefined && entryEnd < startTime) return false;
        if (endTime !== undefined && entryStart > endTime) return false;

        return true;
      })
      .map((entry) => ({
        start: entry.from / 1000, // Convert ms to seconds
        end: entry.to / 1000,
        text: entry.text.trim(),
      }));
  }

  // YouTube Video ID format: exactly 11 characters
  // Allowed characters: a-z, A-Z, 0-9, hyphen (-), and underscore (_)
  // Reference: https://webapps.stackexchange.com/questions/54443/format-for-id-of-youtube-video
  // Note: This is not an official specification. YouTube states:
  // "We don't make any public guarantees about the format for video ids"
  validateVideoId(videoId: string): Result<void, TranscriptError> {
    if (!videoId || typeof videoId !== "string") {
      return {
        ok: false,
        error: {
          type: "UNKNOWN",
          message: "Video ID must be a non-empty string",
        },
      };
    }

    const videoIdPattern = /^[0-9A-Za-z_-]{11}$/;
    if (!videoIdPattern.test(videoId)) {
      return {
        ok: false,
        error: {
          type: "UNKNOWN",
          message: "Invalid video ID format",
        },
      };
    }

    return { ok: true, value: undefined };
  }

  // Validate language code format to ensure it matches YouTube API output formats
  // Accepts: ISO 639-1 (en, ja), ISO 639-2 (fil), BCP-47 (zh-Hans, pt-BR, es-419)
  // Security: Strict pattern matching prevents command injection attacks
  validateLanguageCode(language: string): Result<string, TranscriptError> {
    // Basic validation to prevent code injection
    if (!language || typeof language !== "string") {
      return {
        ok: false,
        error: {
          type: "UNKNOWN",
          message: "Language code must be a non-empty string",
        },
      };
    }

    const trimmed = language.trim();
    if (!trimmed) {
      return {
        ok: false,
        error: {
          type: "UNKNOWN",
          message: "Language code cannot be empty",
        },
      };
    }

    // Validate format: Only allow YouTube API language code formats
    // ISO 639-1: 2-3 lowercase letters (en, ja, hi, fil)
    // BCP-47: language-region format (zh-Hans, zh-Hant, pt-BR, es-419)
    // Security: Prevent command injection by strict pattern matching
    const languagePattern = /^[a-z]{2,3}(-[A-Z][a-z]{3}|-[A-Z]{2}|-\d{3})?$/;

    if (!languagePattern.test(trimmed)) {
      return {
        ok: false,
        error: {
          type: "UNKNOWN",
          message: `Invalid language code format: "${language}". Expected formats: ISO 639-1 (e.g., "en", "ja") or BCP-47 (e.g., "zh-Hans", "pt-BR", "es-419")`,
        },
      };
    }

    // Return validated language code
    return { ok: true, value: trimmed };
  }

  async downloadSubtitleWithYtdlp(
    videoId: string,
    languageCode: string,
    outputPath: string,
  ): Promise<Result<string, TranscriptError>> {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const args = [
      "--write-subs", // Try manual subtitles first
      "--write-auto-subs", // Fall back to auto-generated subtitles
      "--skip-download", // Don't download the video
      "--sub-format",
      "vtt", // Force VTT format
      "--sub-langs",
      languageCode,
      "--output",
      outputPath, // Output path without extension
      videoUrl,
    ];

    return new Promise((resolve) => {
      const child = spawn("yt-dlp", args, {
        env: { ...process.env, PYTHONWARNINGS: "ignore" },
      });
      let stderr = "";

      child.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          // Check if subtitle file was created
          const expectedPath = `${outputPath}.${languageCode}.vtt`;
          if (!fs.existsSync(expectedPath)) {
            resolve({
              ok: false,
              error: {
                type: "NO_SUBTITLES",
                message: `No subtitles available for language: ${languageCode}`,
              },
            });
          } else {
            resolve({ ok: true, value: expectedPath });
          }
        } else {
          // Parse yt-dlp error messages
          const error = this.parseYtdlpError(
            stderr,
            videoId,
            languageCode,
            code,
          );
          resolve({ ok: false, error });
        }
      });

      child.on("error", () => {
        resolve({
          ok: false,
          error: {
            type: "UNKNOWN",
            message: "Failed to execute yt-dlp",
          },
        });
      });
    });
  }

  parseYtdlpError(
    stderr: string,
    videoId: string,
    language: string,
    exitCode: number | null,
  ): TranscriptError {
    if (
      stderr.includes("Video unavailable") ||
      stderr.includes("ERROR: [youtube]")
    ) {
      return {
        type: "VIDEO_UNAVAILABLE",
        message: `Video not found or unavailable (ID: ${videoId}). Please check if the video ID is correct and the video is publicly accessible.`,
      };
    }

    if (stderr.includes("HTTP Error 429")) {
      return {
        type: "RATE_LIMITED",
        message: "Rate limited by YouTube. Please try again later.",
      };
    }

    if (
      stderr.includes("There are no subtitles") ||
      stderr.includes("no subtitles")
    ) {
      return {
        type: "NO_SUBTITLES",
        message: `No subtitles available for language: ${language}`,
      };
    }

    return {
      type: "UNKNOWN",
      message: stderr || `yt-dlp exited with code ${exitCode}`,
    };
  }
}
