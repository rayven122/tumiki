import { spawn } from "child_process";
import * as fs from "fs";
import { YtdlpService } from "@/services/YtdlpService/index.js";
import { parse as parseVtt } from "@plussub/srt-vtt-parser";
import { beforeEach, describe, expect, test, vi } from "vitest";

// EventEmitter のモック
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

// モジュールのモック
vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("fs", () => ({
  mkdtempSync: vi.fn(),
  readFileSync: vi.fn(),
  rmSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock("os", () => ({
  tmpdir: () => "/tmp",
}));

vi.mock("path", () => ({
  join: (...args: string[]) => args.join("/"),
}));

// VTTパーサーのモック
vi.mock("@plussub/srt-vtt-parser", () => ({
  parse: vi.fn(),
}));

const mockSpawn = vi.mocked(spawn);
const mockMkdtempSync = vi.mocked(fs.mkdtempSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockRmSync = vi.mocked(fs.rmSync);
const mockExistsSync = vi.mocked(fs.existsSync);
const mockParseVtt = vi.mocked(parseVtt);

// VTTコンテンツのサンプル
const mockVttContent = `WEBVTT

00:00:00.000 --> 00:00:03.000
We're no strangers to love

00:00:03.000 --> 00:00:06.000
You know the rules and so do I`;

describe("YtdlpService", () => {
  let service: YtdlpService;

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック設定
    mockMkdtempSync.mockReturnValue("/tmp/yt-dlp-test");
    mockReadFileSync.mockReturnValue(mockVttContent);
    mockExistsSync.mockReturnValue(true);
    mockParseVtt.mockReturnValue({
      entries: [
        {
          id: "1",
          from: 0,
          to: 3000,
          text: "We're no strangers to love",
        },
        {
          id: "2",
          from: 3000,
          to: 6000,
          text: "You know the rules and so do I",
        },
      ],
    } as any);

    // YtdlpService のインスタンス作成
    service = new YtdlpService();
  });

  describe("getTranscript", () => {
    test("字幕を正常に取得できる", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn
        .mockReturnValueOnce(mockChild1 as any) // checkYtdlpInstalled
        .mockReturnValueOnce(mockChild2 as any); // downloadSubtitleWithYtdlp

      // checkYtdlpInstalled の成功
      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      // downloadSubtitleWithYtdlp の成功
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 50);

      const transcript = await service.getTranscript("dQw4w9WgXcQ", "en");

      expect(transcript.segments).toHaveLength(2);
      expect(transcript.segments[0]).toMatchObject({
        text: "We're no strangers to love",
      });

      expect(mockRmSync).toHaveBeenCalledWith("/tmp/yt-dlp-test", {
        recursive: true,
        force: true,
      });
    });

    test("yt-dlpがインストールされていない場合", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild as any);

      // checkYtdlpInstalled の失敗
      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 0);

      await expect(service.getTranscript("dQw4w9WgXcQ", "en")).rejects.toThrow(
        "yt-dlp is not installed",
      );
    });

    test("字幕のダウンロードに失敗した場合", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn
        .mockReturnValueOnce(mockChild1 as any)
        .mockReturnValueOnce(mockChild2 as any);
      mockExistsSync.mockReturnValue(false);

      // checkYtdlpInstalled の成功
      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      // downloadSubtitleWithYtdlp の失敗（字幕ファイルが作成されない）
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 50);

      await expect(service.getTranscript("dQw4w9WgXcQ", "ja")).rejects.toThrow(
        "No subtitles available",
      );
    });

    test("時間範囲フィルタリング", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn
        .mockReturnValueOnce(mockChild1 as any)
        .mockReturnValueOnce(mockChild2 as any);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 50);

      const transcript = await service.getTranscript("dQw4w9WgXcQ", "en", 2, 5);

      // mapParsedEntriesToSegments が呼ばれることを確認
      // startTime=2秒、endTime=5秒の場合
      // First segment: start=0, end=3 → end>=2なので含まれる
      // Second segment: start=3, end=6 → start<=5なので含まれる
      expect(transcript.segments).toHaveLength(2);
      expect(transcript.segments[0]?.text).toBe("We're no strangers to love");
      expect(transcript.segments[1]?.text).toBe(
        "You know the rules and so do I",
      );
    });

    test("テンポラリディレクトリのクリーンアップ", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn
        .mockReturnValueOnce(mockChild1 as any)
        .mockReturnValueOnce(mockChild2 as any);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 50);

      await service.getTranscript("dQw4w9WgXcQ", "en");

      expect(mockRmSync).toHaveBeenCalledWith("/tmp/yt-dlp-test", {
        recursive: true,
        force: true,
      });
    });

    test("クリーンアップエラーを無視", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn
        .mockReturnValueOnce(mockChild1 as any)
        .mockReturnValueOnce(mockChild2 as any);
      mockRmSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 50);

      const transcript = await service.getTranscript("dQw4w9WgXcQ", "en");

      // クリーンアップエラーが発生してもエラーを投げない
      expect(transcript.segments).toHaveLength(2);
    });

    test("無効なビデオIDでエラーになる", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn
        .mockReturnValueOnce(mockChild1 as any)
        .mockReturnValueOnce(mockChild2 as any);

      // checkYtdlpInstalled の成功
      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      // downloadSubtitleWithYtdlp が無効なビデオIDエラーを返す
      setTimeout(() => {
        const stderrCall = mockChild2.stderr.on.mock.calls.find(
          (call: unknown[]) => call[0] === "data",
        ) as [string, (data: Buffer) => void] | undefined;
        if (stderrCall) {
          stderrCall[1](Buffer.from("Invalid video ID"));
        }

        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 50);

      await expect(service.getTranscript("invalid-id", "en")).rejects.toThrow(
        "Invalid video ID format",
      );
    });

    test("無効な言語コードでエラーになる", async () => {
      const mockChild1 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1 as any);

      // checkYtdlpInstalled の成功
      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      await expect(
        service.getTranscript("dQw4w9WgXcQ", "INVALID"),
      ).rejects.toThrow("Invalid language code format");
    });
  });
});
