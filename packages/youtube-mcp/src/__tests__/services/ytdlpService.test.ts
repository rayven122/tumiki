import type { YtdlpService } from "@/services/ytdlpService.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

// モックの型定義
const mockExecAsync = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
const mockReadFile = vi.fn().mockResolvedValue("");
const mockUnlink = vi.fn().mockResolvedValue(undefined);

// モジュールのモック
vi.mock("util", () => ({
  promisify: () => mockExecAsync,
}));

vi.mock("fs", () => ({
  promises: {
    readFile: mockReadFile,
    unlink: mockUnlink,
  },
}));

describe("YtdlpService", () => {
  let service: YtdlpService;

  beforeEach(async () => {
    vi.clearAllMocks();
    // YtdlpService を動的インポート（モックが設定された後）
    const module = await import("@/services/ytdlpService.js");
    const YtdlpServiceClass = module.YtdlpService;
    service = new YtdlpServiceClass();
  });

  describe("checkYtdlpInstalled", () => {
    test("yt-dlpがインストールされている場合はtrueを返す", async () => {
      mockExecAsync.mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" });

      const result = await service.checkYtdlpInstalled();
      expect(result).toBe(true);
      expect(mockExecAsync).toHaveBeenCalledWith("yt-dlp --version");
    });

    test("yt-dlpがインストールされていない場合はfalseを返す", async () => {
      mockExecAsync.mockRejectedValueOnce(new Error("command not found"));

      const result = await service.checkYtdlpInstalled();
      expect(result).toBe(false);
    });
  });

  describe("getTranscript", () => {
    const mockVttContent = `WEBVTT
Kind: captions
Language: en

00:00:00.840 --> 00:00:03.629 align:start position:0%
We're<00:00:01.079><c> no</c><00:00:01.359><c> strangers</c><00:00:01.840><c> to</c><00:00:02.079><c> love</c>

00:00:03.639 --> 00:00:06.670 align:start position:0%
You<00:00:03.879><c> know</c><00:00:04.080><c> the</c><00:00:04.240><c> rules</c><00:00:04.560><c> and</c><00:00:04.799><c> so</c><00:00:05.040><c> do</c><00:00:05.279><c> I</c>`;

    beforeEach(() => {
      mockReadFile.mockResolvedValue(mockVttContent);
      mockUnlink.mockResolvedValue(undefined);
    });

    test("字幕を正常に取得できる", async () => {
      // yt-dlp のチェックと実行のモック
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" }) // version check
        .mockResolvedValueOnce({ stdout: "Download completed", stderr: "" }); // download

      const result = await service.getTranscript("dQw4w9WgXcQ", "en");

      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]).toStrictEqual({
        start: 0.84,
        end: 3.629,
        text: "We're no strangers to love",
      });
      expect(result.segments[1]).toStrictEqual({
        start: 3.639,
        end: 6.67,
        text: "You know the rules and so do I",
      });
    });

    test("時間範囲指定で字幕をフィルタリングできる", async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" })
        .mockResolvedValueOnce({ stdout: "Download completed", stderr: "" });

      const result = await service.getTranscript("dQw4w9WgXcQ", "en", 1, 4);

      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]?.text).toBe("We're no strangers to love");
      expect(result.segments[1]?.text).toBe("You know the rules and so do I");
    });

    test("yt-dlpがインストールされていない場合はエラーを投げる", async () => {
      mockExecAsync.mockRejectedValueOnce(new Error("command not found"));

      await expect(service.getTranscript("dQw4w9WgXcQ", "en")).rejects.toThrow(
        "yt-dlp is not installed",
      );
    });

    test("レート制限エラーを適切に処理する", async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" })
        .mockRejectedValueOnce(new Error("HTTP Error 429: Too Many Requests"));

      await expect(service.getTranscript("dQw4w9WgXcQ", "en")).rejects.toThrow(
        "Rate limited by YouTube",
      );
    });

    test("字幕が存在しない場合はエラーを投げる", async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" })
        .mockRejectedValueOnce(new Error("There are no subtitles"));

      await expect(service.getTranscript("dQw4w9WgXcQ", "xx")).rejects.toThrow(
        "No subtitles available for language: xx",
      );
    });

    test("VTTファイルが見つからない場合は字幕なしエラーを投げる", async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" })
        .mockResolvedValueOnce({ stdout: "Download completed", stderr: "" });

      mockReadFile.mockRejectedValueOnce(
        Object.assign(
          new Error(
            "ENOENT: no such file or directory, open '/tmp/transcript_test_xx_123.xx.vtt'",
          ),
          {
            code: "ENOENT",
          },
        ),
      );

      await expect(service.getTranscript("test", "xx")).rejects.toThrow(
        "No subtitles available for language: xx",
      );
    });

    test("動画が見つからない場合は適切なエラーを投げる", async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" })
        .mockRejectedValueOnce(
          new Error("ERROR: [youtube] invalid_id: Video unavailable"),
        );

      await expect(service.getTranscript("invalid_id", "en")).rejects.toThrow(
        "Video not found or unavailable (ID: invalid_id)",
      );
    });

    test("ネットワークエラーを適切に処理する", async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" })
        .mockRejectedValueOnce(new Error("ECONNREFUSED: Connection refused"));

      await expect(service.getTranscript("dQw4w9WgXcQ", "en")).rejects.toThrow(
        "Network error occurred while fetching transcript",
      );
    });

    test("予期しないエラーの場合は詳細付きエラーを投げる", async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" })
        .mockRejectedValueOnce(new Error("Unexpected error occurred"));

      await expect(service.getTranscript("dQw4w9WgXcQ", "en")).rejects.toThrow(
        "Failed to retrieve transcript: Unexpected error occurred",
      );
    });

    test("parseTimestampが正しく時間を変換する", async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" })
        .mockResolvedValueOnce({ stdout: "Download completed", stderr: "" });

      const vttWithFullTimestamp = `WEBVTT

01:23:45.678 --> 01:23:48.900
Test with hours`;

      mockReadFile.mockResolvedValue(vttWithFullTimestamp);

      const result = await service.getTranscript("test", "en");

      expect(result.segments).toHaveLength(1);
      expect(result.segments[0]).toStrictEqual({
        start: 5025.678, // 1*3600 + 23*60 + 45.678
        end: 5028.9, // 1*3600 + 23*60 + 48.900
        text: "Test with hours",
      });
    });

    test("時間範囲フィルタリングのエッジケース（開始時間より前のセグメントをスキップ）", async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" })
        .mockResolvedValueOnce({ stdout: "Download completed", stderr: "" });

      const vttContent = `WEBVTT

00:00:00.000 --> 00:00:02.000
Skip this

00:00:05.000 --> 00:00:07.000
Include this

00:00:10.000 --> 00:00:12.000
Also include this`;

      mockReadFile.mockResolvedValue(vttContent);

      const result = await service.getTranscript("test", "en", 3, 15);

      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]?.text).toBe("Include this");
      expect(result.segments[1]?.text).toBe("Also include this");
    });

    test("時間範囲フィルタリングのエッジケース（終了時間より後のセグメントで停止）", async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "2025.09.05", stderr: "" })
        .mockResolvedValueOnce({ stdout: "Download completed", stderr: "" });

      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:03.000
Include this

00:00:04.000 --> 00:00:06.000
Also include this

00:00:10.000 --> 00:00:12.000
Skip this - after endTime

00:00:15.000 --> 00:00:17.000
Also skip this`;

      mockReadFile.mockResolvedValue(vttContent);

      const result = await service.getTranscript("test", "en", 0, 8);

      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]?.text).toBe("Include this");
      expect(result.segments[1]?.text).toBe("Also include this");
    });
  });
});
