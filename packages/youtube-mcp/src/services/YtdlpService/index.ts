import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { TranscriptResponse } from "@/types/index.js";
import { parse as parseVtt } from "@plussub/srt-vtt-parser";

import {
  checkYtdlpInstalled,
  downloadSubtitleWithYtdlp,
  mapParsedEntriesToSegments,
} from "./helper.js";

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

/**
 * Service for retrieving YouTube video transcripts using yt-dlp
 * This service provides a simple interface with only one public method: getTranscript
 */
export class YtdlpService {
  /**
   * Get transcript for a YouTube video
   * @param videoId YouTube video ID (11 characters)
   * @param language Language code (e.g., "en", "ja", "zh-Hans")
   * @param startTime Optional start time in seconds
   * @param endTime Optional end time in seconds
   * @returns Transcript segments
   * @throws Error if yt-dlp is not installed or transcript cannot be retrieved
   */
  async getTranscript(
    videoId: string,
    language: string,
    startTime?: number,
    endTime?: number,
  ): Promise<TranscriptResponse> {
    // Check yt-dlp installation
    const installResult = await checkYtdlpInstalled();
    if (!installResult.ok) {
      throw new Error(installResult.error.message);
    }

    // Create temp directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "yt-dlp-"));
    const tempFilename = `subtitle_${crypto.randomBytes(8).toString("hex")}`;
    const outputPath = path.join(tempDir, tempFilename);

    try {
      const downloadResult = await downloadSubtitleWithYtdlp(
        videoId,
        language,
        outputPath,
      );
      if (!downloadResult.ok) {
        throw new Error(downloadResult.error.message);
      }

      // Parse VTT content
      const vttContent = fs.readFileSync(downloadResult.value, "utf-8");
      const parsed = parseVtt(vttContent) as VttParsedResult;

      // Convert to our segment format
      const segments = mapParsedEntriesToSegments(parsed, startTime, endTime);

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
}
