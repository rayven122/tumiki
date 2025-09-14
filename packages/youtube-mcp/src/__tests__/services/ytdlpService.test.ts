import type { YtdlpService } from "@/services/ytdlpService.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

// モックの型定義
const mockSpawn = vi.fn();
const mockReadFile = vi.fn().mockResolvedValue("");
const mockUnlink = vi.fn().mockReturnValue(Promise.resolve(undefined));
const mockAccess = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);

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
  spawn: mockSpawn,
}));

vi.mock("fs", () => ({
  promises: {
    readFile: mockReadFile,
    unlink: mockUnlink,
    access: mockAccess,
    mkdir: mockMkdir,
  },
}));

describe("YtdlpService", () => {
  let service: YtdlpService;

  beforeEach(async () => {
    vi.clearAllMocks();

    // デフォルトのスポーンモック設定
    const mockChild = createMockChildProcess();
    mockSpawn.mockReturnValue(mockChild);

    // YtdlpService を動的インポート（モックが設定された後）
    const module = await import("@/services/ytdlpService.js");
    const YtdlpServiceClass = module.YtdlpService;
    service = new YtdlpServiceClass();
  });

  describe("checkYtdlpInstalled", () => {
    test("yt-dlpがインストールされている場合はtrueを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      // 正常終了をシミュレート
      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      const result = await service.checkYtdlpInstalled();
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith("yt-dlp", ["--version"]);
    });

    test("yt-dlpがインストールされていない場合はfalseを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      // エラー終了をシミュレート
      setTimeout(() => {
        const errorCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "error",
        ) as [string, (error: Error) => void] | undefined;
        if (errorCall) {
          errorCall[1](new Error("command not found"));
        }
      }, 0);

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
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn
        .mockReturnValueOnce(mockChild1) // version check
        .mockReturnValueOnce(mockChild2); // download

      // version check 成功
      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);
      // download 成功
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 10);

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
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 10);

      const result = await service.getTranscript("dQw4w9WgXcQ", "en", 1, 4);

      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]?.text).toBe("We're no strangers to love");
      expect(result.segments[1]?.text).toBe("You know the rules and so do I");
    });

    test("yt-dlpがインストールされていない場合はエラーを投げる", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      setTimeout(() => {
        const errorCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "error",
        ) as [string, (error: Error) => void] | undefined;
        if (errorCall) {
          errorCall[1](new Error("command not found"));
        }
      }, 0);

      await expect(service.getTranscript("dQw4w9WgXcQ", "en")).rejects.toThrow(
        "yt-dlp is not installed",
      );
    });

    test("レート制限エラーを適切に処理する", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);
      setTimeout(() => {
        const stderrCall = mockChild2.stderr.on.mock.calls[0] as
          | [string, (data: string) => void]
          | undefined;
        if (stderrCall) {
          stderrCall[1]("HTTP Error 429: Too Many Requests");
        }
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 10);

      await expect(service.getTranscript("dQw4w9WgXcQ", "en")).rejects.toThrow(
        "Rate limited by YouTube",
      );
    });

    test("字幕が存在しない場合はエラーを投げる", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);
      setTimeout(() => {
        const stderrCall = mockChild2.stderr.on.mock.calls[0] as
          | [string, (data: string) => void]
          | undefined;
        if (stderrCall) {
          stderrCall[1]("There are no subtitles");
        }
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 10);

      await expect(service.getTranscript("dQw4w9WgXcQ", "xx")).rejects.toThrow(
        "No subtitles available for language: xx",
      );
    });

    test("VTTファイルが見つからない場合は字幕なしエラーを投げる", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 10);

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
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);
      setTimeout(() => {
        const stderrCall = mockChild2.stderr.on.mock.calls[0] as
          | [string, (data: string) => void]
          | undefined;
        if (stderrCall) {
          stderrCall[1]("ERROR: [youtube] invalid_id: Video unavailable");
        }
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 10);

      await expect(service.getTranscript("invalid_id", "en")).rejects.toThrow(
        "Video not found or unavailable (ID: invalid_id)",
      );
    });

    test("ネットワークエラーを適切に処理する", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);
      setTimeout(() => {
        const stderrCall = mockChild2.stderr.on.mock.calls[0] as
          | [string, (data: string) => void]
          | undefined;
        if (stderrCall) {
          stderrCall[1]("ECONNREFUSED: Connection refused");
        }
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 10);

      await expect(service.getTranscript("dQw4w9WgXcQ", "en")).rejects.toThrow(
        "Network error occurred while fetching transcript",
      );
    });

    test("予期しないエラーの場合は詳細付きエラーを投げる", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);
      setTimeout(() => {
        const stderrCall = mockChild2.stderr.on.mock.calls[0] as
          | [string, (data: string) => void]
          | undefined;
        if (stderrCall) {
          stderrCall[1]("Unexpected error occurred");
        }
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 10);

      await expect(service.getTranscript("dQw4w9WgXcQ", "en")).rejects.toThrow(
        "Failed to retrieve transcript: Unexpected error occurred",
      );
    });

    test("parseTimestampが正しく時間を変換する", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 10);

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
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 10);

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
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 10);

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

  // コンストラクタのテスト
  describe("constructor", () => {
    test("デフォルトのtempDirを使用", async () => {
      const module = await import("@/services/ytdlpService.js");
      const YtdlpServiceClass = module.YtdlpService;
      const service = new YtdlpServiceClass();

      // tempDirが使用されることを間接的に確認（ディレクトリ作成で）
      mockAccess.mockRejectedValueOnce(new Error("ENOENT"));
      mockMkdir.mockResolvedValueOnce(undefined);

      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 10);

      mockReadFile.mockResolvedValue(
        "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nTest",
      );
      mockUnlink.mockResolvedValue(undefined);
      await service.getTranscript("test", "en");

      expect(mockMkdir).toHaveBeenCalledWith("/tmp", { recursive: true });
    });

    test("カスタムtempDirを指定", async () => {
      const customDir = "/custom/temp";
      const module = await import("@/services/ytdlpService.js");
      const YtdlpServiceClass = module.YtdlpService;
      const service = new YtdlpServiceClass(customDir);

      mockAccess.mockRejectedValueOnce(new Error("ENOENT"));
      mockMkdir.mockResolvedValueOnce(undefined);

      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 10);

      mockReadFile.mockResolvedValue(
        "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nTest",
      );
      mockUnlink.mockResolvedValue(undefined);
      await service.getTranscript("test", "en");

      expect(mockMkdir).toHaveBeenCalledWith(customDir, { recursive: true });
    });

    test("環境変数YTDLP_TEMP_DIRを使用", async () => {
      const envDir = "/env/temp";
      const originalEnv = process.env.YTDLP_TEMP_DIR;
      process.env.YTDLP_TEMP_DIR = envDir;

      const module = await import("@/services/ytdlpService.js");
      const YtdlpServiceClass = module.YtdlpService;
      const service = new YtdlpServiceClass();

      mockAccess.mockRejectedValueOnce(new Error("ENOENT"));
      mockMkdir.mockResolvedValueOnce(undefined);

      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 10);

      mockReadFile.mockResolvedValue(
        "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nTest",
      );
      mockUnlink.mockResolvedValue(undefined);
      await service.getTranscript("test", "en");

      expect(mockMkdir).toHaveBeenCalledWith(envDir, { recursive: true });

      // 環境変数を元に戻す
      if (originalEnv !== undefined) {
        process.env.YTDLP_TEMP_DIR = originalEnv;
      } else {
        delete process.env.YTDLP_TEMP_DIR;
      }
    });

    test("優先順位：引数 > 環境変数 > デフォルト", async () => {
      const envDir = "/env/temp";
      const argDir = "/arg/temp";
      const originalEnv = process.env.YTDLP_TEMP_DIR;
      process.env.YTDLP_TEMP_DIR = envDir;

      const module = await import("@/services/ytdlpService.js");
      const YtdlpServiceClass = module.YtdlpService;
      const service = new YtdlpServiceClass(argDir);

      mockAccess.mockRejectedValueOnce(new Error("ENOENT"));
      mockMkdir.mockResolvedValueOnce(undefined);

      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 10);

      mockReadFile.mockResolvedValue(
        "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nTest",
      );
      mockUnlink.mockResolvedValue(undefined);
      await service.getTranscript("test", "en");

      expect(mockMkdir).toHaveBeenCalledWith(argDir, { recursive: true });

      // 環境変数を元に戻す
      if (originalEnv !== undefined) {
        process.env.YTDLP_TEMP_DIR = originalEnv;
      } else {
        delete process.env.YTDLP_TEMP_DIR;
      }
    });
  });

  // VTTパース処理のエッジケース
  describe("VTT parsing edge cases", () => {
    test("不正な時間形式のVTTを処理", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 10);

      const vttWithInvalidTimes = `WEBVTT

--> 00:00:03.000
Invalid start timestamp

00:00:01.000 --> 
Missing end timestamp

00:00:05.000 --> 00:00:07.000
Valid entry`;

      mockReadFile.mockResolvedValue(vttWithInvalidTimes);
      mockUnlink.mockReturnValue(Promise.resolve(undefined));
      const result = await service.getTranscript("test", "en");

      // 有効なエントリのみが処理される
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0]?.text).toBe("Valid entry");
    });
  });

  // parseTimestamp関数のエッジケース
  describe("parseTimestamp edge cases", () => {
    test("NaN値を含む時間形式の処理", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 10);

      const vttWithInvalidNumbers = `WEBVTT

NaN:30:15.000 --> 01:30:20.000
Invalid hours

01:NaN:15.000 --> 01:30:20.000
Invalid minutes

01:30:NaN.000 --> 01:30:20.000
Invalid seconds`;

      mockReadFile.mockResolvedValue(vttWithInvalidNumbers);
      mockUnlink.mockReturnValue(Promise.resolve(undefined));
      const result = await service.getTranscript("test", "en");

      // いずれかのパートがNaNの場合は全体が0として処理される
      expect(result.segments).toHaveLength(3);
      expect(result.segments[0]?.start).toBe(0); // NaN:30:15 -> 0（NaNがあるため）
      expect(result.segments[1]?.start).toBe(0); // 01:NaN:15 -> 0（NaNがあるため）
      expect(result.segments[2]?.start).toBe(0); // 01:30:NaN -> 0（NaNがあるため）
    });
  });

  // spawn使用による新しいエッジケース
  describe("spawn integration edge cases", () => {
    test("yt-dlpプロセスが予期せず終了（コード2）", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(2); // 異常終了コード
        }
      }, 10);

      await expect(service.getTranscript("test", "en")).rejects.toThrow(
        "yt-dlp exited with code 2",
      );
    });

    test("stderrが空で異常終了", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(0);
        }
      }, 0);
      setTimeout(() => {
        // stderrデータなしで異常終了
        const closeCall = mockChild2.on.mock.calls.find(
          (call) => call[0] === "close",
        );
        if (closeCall) {
          (closeCall[1] as (code: number) => void)(1);
        }
      }, 10);

      await expect(service.getTranscript("test", "en")).rejects.toThrow(
        "yt-dlp exited with code 1",
      );
    });
  });
});
