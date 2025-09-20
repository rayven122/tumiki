import { spawn } from "child_process";
import * as fs from "fs";
import type { TranscriptSegment } from "@/types/index.js";

import type { Result, TranscriptError } from "./index.js";

type VttParsedResult = {
  entries: { id: string; from: number; to: number; text: string }[];
};

/**
 * Check if yt-dlp is installed
 */
export async function checkYtdlpInstalled(): Promise<
  Result<void, TranscriptError>
> {
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

/**
 * Validate YouTube Video ID format
 * YouTube Video ID format: exactly 11 characters
 * Allowed characters: a-z, A-Z, 0-9, hyphen (-), and underscore (_)
 */
export function validateVideoId(
  videoId: string,
): Result<void, TranscriptError> {
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

/**
 * Validate language code format
 * Accepts: ISO 639-1 (en, ja), ISO 639-2 (fil), BCP-47 (zh-Hans, pt-BR, es-419)
 */
export function validateLanguageCode(
  language: string,
): Result<string, TranscriptError> {
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

  return { ok: true, value: trimmed };
}

/**
 * Parse yt-dlp error messages
 */
export function parseYtdlpError(
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

/**
 * Download subtitle using yt-dlp
 */
export async function downloadSubtitleWithYtdlp(
  videoId: string,
  languageCode: string,
  outputPath: string,
): Promise<Result<string, TranscriptError>> {
  // Validate video ID
  const videoIdResult = validateVideoId(videoId);
  if (!videoIdResult.ok) {
    return { ok: false, error: videoIdResult.error };
  }

  // Validate language code
  const languageResult = validateLanguageCode(languageCode);
  if (!languageResult.ok) {
    return { ok: false, error: languageResult.error };
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const args = [
    "--write-subs", // Try manual subtitles first
    "--write-auto-subs", // Fall back to auto-generated subtitles
    "--skip-download", // Don't download the video
    "--sub-format",
    "vtt", // Force VTT format
    "--sub-langs",
    languageResult.value,
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
        const expectedPath = `${outputPath}.${languageResult.value}.vtt`;
        if (!fs.existsSync(expectedPath)) {
          resolve({
            ok: false,
            error: {
              type: "NO_SUBTITLES",
              message: `No subtitles available for language: ${languageResult.value}`,
            },
          });
        } else {
          resolve({ ok: true, value: expectedPath });
        }
      } else {
        // Parse yt-dlp error messages
        const error = parseYtdlpError(
          stderr,
          videoId,
          languageResult.value,
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

/**
 * Map parsed VTT entries to transcript segments
 */
export function mapParsedEntriesToSegments(
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
