import { spawn } from "child_process";
import * as fs from "fs";
import type { Failure, Success } from "@/lib/result.js";
import type { TranscriptError } from "@/lib/ytdlp/errors/index.js";
import {
  checkYtdlpInstalled,
  downloadSubtitleWithYtdlp,
  mapParsedEntriesToSegments,
} from "@/lib/ytdlp/helper.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

// child_processモジュールをモック化
vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

// fsモジュールをモック化
vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

// EventEmitterのモックタイプ
type MockChildProcess = {
  stdout: { on: ReturnType<typeof vi.fn> };
  stderr: { on: ReturnType<typeof vi.fn> };
  on: ReturnType<typeof vi.fn>;
};

const createMockChildProcess = (): MockChildProcess => ({
  stdout: { on: vi.fn() },
  stderr: { on: vi.fn() },
  on: vi.fn(),
});

const mockSpawn = vi.mocked(spawn);
const mockExistsSync = vi.mocked(fs.existsSync);

describe("ytdlp helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkYtdlpInstalled", () => {
    test("正常系: yt-dlpがインストールされている場合にSuccessを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild as any);

      // 成功時の動作をシミュレート
      const promise = checkYtdlpInstalled();

      // closeイベントを発火してコード0で終了
      const closeCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1] as ((code: number) => void) | undefined;
      closeCallback?.(0);

      const result = await promise;

      expect(result).toStrictEqual({
        success: true,
        data: undefined,
      } satisfies Success<void>);
      expect(mockSpawn).toHaveBeenCalledWith("yt-dlp", ["--version"]);
    });

    test("異常系: yt-dlpがインストールされていない場合にErrorを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild as any);

      const promise = checkYtdlpInstalled();

      // エラーイベントを発火
      const errorCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "error",
      )?.[1] as ((error: Error) => void) | undefined;
      errorCallback?.(new Error("ENOENT"));

      const result = await promise;

      expect(result).toStrictEqual({
        success: false,
        error: expect.objectContaining({
          type: "NOT_INSTALLED",
          message: expect.stringContaining("yt-dlp is not installed"),
        }),
      } satisfies Failure<TranscriptError>);
    });

    test("異常系: yt-dlpがゼロ以外の終了コードで終了した場合にErrorを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild as any);

      const promise = checkYtdlpInstalled();

      // closeイベントを発火してコード1で終了
      const closeCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1] as ((code: number) => void) | undefined;
      closeCallback?.(1);

      const result = await promise;

      expect(result).toStrictEqual({
        success: false,
        error: expect.objectContaining({
          type: "NOT_INSTALLED",
          message: expect.stringContaining("yt-dlp is not installed"),
        }),
      } satisfies Failure<TranscriptError>);
    });
  });

  describe("downloadSubtitleWithYtdlp", () => {
    test("正常系: 字幕ダウンロードが成功する場合にファイルパスを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild as any);
      mockExistsSync.mockReturnValueOnce(true); // ファイルが存在するとモック

      const promise = downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ", // 正しい形式のYouTube ID（11文字）
        "en",
        "/tmp/output",
      );

      // 成功時の動作をシミュレート
      const closeCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1] as ((code: number) => void) | undefined;
      closeCallback?.(0);

      const result = await promise;

      expect(result).toStrictEqual({
        success: true,
        data: "/tmp/output.en.vtt",
      } satisfies Success<string>);
      expect(mockSpawn).toHaveBeenCalledWith(
        "yt-dlp",
        [
          "--write-subs",
          "--write-auto-subs",
          "--skip-download",
          "--sub-format",
          "vtt",
          "--sub-langs",
          "en",
          "--output",
          "/tmp/output",
          "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ],
        expect.objectContaining({
          env: expect.objectContaining({
            PYTHONWARNINGS: "ignore",
          }),
        }),
      );
    });

    test("異常系: レート制限エラーが発生した場合にRateLimit Errorを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild as any);

      const promise = downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ", // 正しい形式のYouTube ID（11文字）
        "en",
        "/tmp/output",
      );

      // stderrにレート制限エラーを出力
      const stderrCallback = mockChild.stderr.on.mock.calls.find(
        (call) => call[0] === "data",
      )?.[1] as ((data: Buffer) => void) | undefined;
      stderrCallback?.(Buffer.from("HTTP Error 429: Too Many Requests"));

      // エラー終了
      const closeCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1] as ((code: number) => void) | undefined;
      closeCallback?.(1);

      const result = await promise;

      expect(result).toStrictEqual({
        success: false,
        error: expect.objectContaining({
          type: "RATE_LIMITED",
          message: expect.stringContaining("YouTube rate limit exceeded"),
        }),
      } satisfies Failure<TranscriptError>);
    });

    test("異常系: 字幕が利用できない場合にNoSubtitles Errorを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild as any);

      const promise = downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ", // 正しい形式のYouTube ID（11文字）
        "en",
        "/tmp/output",
      );

      // stderrに字幕なしエラーを出力
      const stderrCallback = mockChild.stderr.on.mock.calls.find(
        (call) => call[0] === "data",
      )?.[1] as ((data: Buffer) => void) | undefined;
      stderrCallback?.(Buffer.from("There are no subtitles"));

      // エラー終了
      const closeCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1] as ((code: number) => void) | undefined;
      closeCallback?.(1);

      const result = await promise;

      expect(result).toStrictEqual({
        success: false,
        error: expect.objectContaining({
          type: "NO_SUBTITLES",
          message: expect.stringContaining("No subtitles available"),
        }),
      } satisfies Failure<TranscriptError>);
    });

    test("異常系: 動画が利用できない場合にVideoUnavailable Errorを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild as any);

      const promise = downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ", // 正しい形式のYouTube ID（11文字）
        "en",
        "/tmp/output",
      );

      // stderrに動画なしエラーを出力
      const stderrCallback = mockChild.stderr.on.mock.calls.find(
        (call) => call[0] === "data",
      )?.[1] as ((data: Buffer) => void) | undefined;
      stderrCallback?.(Buffer.from("Video unavailable"));

      // エラー終了
      const closeCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1] as ((code: number) => void) | undefined;
      closeCallback?.(1);

      const result = await promise;

      expect(result).toStrictEqual({
        success: false,
        error: expect.objectContaining({
          type: "VIDEO_UNAVAILABLE",
          message: expect.stringContaining("is unavailable or private"),
        }),
      } satisfies Failure<TranscriptError>);
    });

    test("異常系: ネットワークエラーが発生した場合にNetworkError Errorを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild as any);

      const promise = downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ", // 正しい形式のYouTube ID（11文字）
        "en",
        "/tmp/output",
      );

      // stderrにネットワークエラーを出力
      const stderrCallback = mockChild.stderr.on.mock.calls.find(
        (call) => call[0] === "data",
      )?.[1] as ((data: Buffer) => void) | undefined;
      stderrCallback?.(Buffer.from("Connection timed out"));

      // エラー終了
      const closeCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1] as ((code: number) => void) | undefined;
      closeCallback?.(1);

      const result = await promise;

      expect(result).toStrictEqual({
        success: false,
        error: expect.objectContaining({
          type: "UNKNOWN",
          message: expect.stringContaining("Connection timed out"),
        }),
      } satisfies Failure<TranscriptError>);
    });

    test("異常系: 無効なvideo IDの場合エラーを返す", async () => {
      const result = await downloadSubtitleWithYtdlp(
        "invalid", // 無効なvideo ID
        "en",
        "/tmp/output",
      );

      expect(result).toStrictEqual({
        success: false,
        error: expect.objectContaining({
          type: "UNKNOWN",
          message: "Invalid video ID format",
        }),
      } satisfies Failure<TranscriptError>);
    });

    test("異常系: 無効な言語コードの場合エラーを返す", async () => {
      const result = await downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ",
        "invalid-lang", // 無効な言語コード
        "/tmp/output",
      );

      expect(result).toStrictEqual({
        success: false,
        error: expect.objectContaining({
          type: "UNKNOWN",
          message: expect.stringContaining("Invalid language code format"),
        }),
      } satisfies Failure<TranscriptError>);
    });

    test("異常系: 字幕ファイルが作成されなかった場合エラーを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild as any);
      mockExistsSync.mockReturnValueOnce(false); // ファイルが存在しない

      const promise = downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ",
        "en",
        "/tmp/output",
      );

      // 正常終了するがファイルがない
      const closeCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1] as ((code: number) => void) | undefined;
      closeCallback?.(0);

      const result = await promise;

      expect(result).toStrictEqual({
        success: false,
        error: expect.objectContaining({
          type: "NO_SUBTITLES",
          message:
            "No subtitles available for video dQw4w9WgXcQ in language en",
        }),
      } satisfies Failure<TranscriptError>);
    });

    test("異常系: 一般的なエラーが発生した場合にUnknown Errorを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild as any);

      const promise = downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ", // 正しい形式のYouTube ID（11文字）
        "en",
        "/tmp/output",
      );

      // stderrに一般的なエラーを出力
      const stderrCallback = mockChild.stderr.on.mock.calls.find(
        (call) => call[0] === "data",
      )?.[1] as ((data: Buffer) => void) | undefined;
      stderrCallback?.(Buffer.from("Unknown error occurred"));

      // エラー終了
      const closeCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1] as ((code: number) => void) | undefined;
      closeCallback?.(1);

      const result = await promise;

      expect(result).toStrictEqual({
        success: false,
        error: expect.objectContaining({
          type: "UNKNOWN",
          message: expect.stringContaining("Unknown error occurred"),
        }),
      } satisfies Failure<TranscriptError>);
    });

    test("異常系: プロセスエラーが発生した場合にErrorを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild as any);

      const promise = downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ", // 正しい形式のYouTube ID（11文字）
        "en",
        "/tmp/output",
      );

      // エラーイベントを発火
      const errorCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "error",
      )?.[1] as ((error: Error) => void) | undefined;
      errorCallback?.(new Error("Process error"));

      const result = await promise;

      expect(result).toStrictEqual({
        success: false,
        error: expect.objectContaining({
          type: "UNKNOWN",
          message: expect.stringContaining("Failed to execute yt-dlp"),
        }),
      } satisfies Failure<TranscriptError>);
    });
  });

  describe("mapParsedEntriesToSegments", () => {
    const mockParsedVtt = {
      entries: [
        {
          id: "1",
          from: 0,
          to: 3000,
          text: "First segment",
        },
        {
          id: "2",
          from: 3000,
          to: 6000,
          text: "Second segment",
        },
        {
          id: "3",
          from: 6000,
          to: 9000,
          text: "Third segment",
        },
        {
          id: "4",
          from: 9000,
          to: 12000,
          text: "Fourth segment",
        },
      ],
    };

    test("正常系: 時間範囲なしで全セグメントをマップする", () => {
      const result = mapParsedEntriesToSegments(mockParsedVtt);

      expect(result).toStrictEqual([
        { start: 0, end: 3, duration: 3, text: "First segment" },
        { start: 3, end: 6, duration: 3, text: "Second segment" },
        { start: 6, end: 9, duration: 3, text: "Third segment" },
        { start: 9, end: 12, duration: 3, text: "Fourth segment" },
      ]);
    });

    test("正常系: 開始時間と終了時間でフィルタする", () => {
      const result = mapParsedEntriesToSegments(mockParsedVtt, 3, 9);

      expect(result).toStrictEqual([
        { start: 0, end: 3, duration: 3, text: "First segment" },
        { start: 3, end: 6, duration: 3, text: "Second segment" },
        { start: 6, end: 9, duration: 3, text: "Third segment" },
        { start: 9, end: 12, duration: 3, text: "Fourth segment" },
      ]);
    });

    test("正常系: 開始時間のみでフィルタする", () => {
      const result = mapParsedEntriesToSegments(mockParsedVtt, 6);

      expect(result).toStrictEqual([
        { start: 3, end: 6, duration: 3, text: "Second segment" },
        { start: 6, end: 9, duration: 3, text: "Third segment" },
        { start: 9, end: 12, duration: 3, text: "Fourth segment" },
      ]);
    });

    test("正常系: 終了時間のみでフィルタする", () => {
      const result = mapParsedEntriesToSegments(mockParsedVtt, undefined, 6);

      expect(result).toStrictEqual([
        { start: 0, end: 3, duration: 3, text: "First segment" },
        { start: 3, end: 6, duration: 3, text: "Second segment" },
        { start: 6, end: 9, duration: 3, text: "Third segment" },
      ]);
    });

    test("正常系: 範囲外の時間を指定した場合は空配列を返す", () => {
      const result = mapParsedEntriesToSegments(mockParsedVtt, 15, 20);

      expect(result).toStrictEqual([]);
    });

    test("正常系: 空のエントリの場合は空配列を返す", () => {
      const emptyParsed = { entries: [] };
      const result = mapParsedEntriesToSegments(emptyParsed);

      expect(result).toStrictEqual([]);
    });

    test("正常系: 部分的にオーバーラップするセグメントを含める", () => {
      const overlappingData = {
        entries: [
          { id: "1", from: 1000, to: 4000, text: "Overlapping start" },
          { id: "2", from: 5000, to: 8000, text: "Middle segment" },
          { id: "3", from: 7000, to: 10000, text: "Overlapping end" },
        ],
      };

      const result = mapParsedEntriesToSegments(overlappingData, 3, 7);

      expect(result).toStrictEqual([
        { start: 1, end: 4, duration: 3, text: "Overlapping start" },
        { start: 5, end: 8, duration: 3, text: "Middle segment" },
        { start: 7, end: 10, duration: 3, text: "Overlapping end" },
      ]);
    });
  });
});
