import type { YtdlpService } from "@/services/ytdlpService.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

// モックの型定義
const mockSpawn = vi.fn();
const mockMkdtempSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockRmSync = vi.fn();
const mockExistsSync = vi.fn();

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
  mkdtempSync: mockMkdtempSync,
  readFileSync: mockReadFileSync,
  rmSync: mockRmSync,
  existsSync: mockExistsSync,
}));

vi.mock("os", () => ({
  tmpdir: () => "/tmp",
}));

vi.mock("path", () => ({
  join: (...args: string[]) => args.join("/"),
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
    test("yt-dlpがインストールされている場合はokを返す", async () => {
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
      expect(result.ok).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith("yt-dlp", ["--version"]);
    });

    test("yt-dlpがインストールされていない場合はエラーを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      // エラーコードで終了
      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 0);

      const result = await service.checkYtdlpInstalled();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("NOT_INSTALLED");
        expect(result.error.message).toContain("yt-dlp is not installed");
      }
    });

    test("spawnエラーの場合はエラーを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      // エラーイベントをシミュレート
      setTimeout(() => {
        const errorCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "error",
        ) as [string, () => void] | undefined;
        if (errorCall) {
          errorCall[1]();
        }
      }, 0);

      const result = await service.checkYtdlpInstalled();
      expect(result.ok).toBe(false);
    });
  });

  describe("validateVideoId", () => {
    test("有効な11文字のビデオIDを受け入れる", () => {
      const validIds = [
        "dQw4w9WgXcQ",
        "abc123def45",
        "_-_-_-_-_-_",
        "12345678901",
        "ABCDEFGHIJK",
      ];

      for (const id of validIds) {
        const result = service.validateVideoId(id);
        expect(result.ok).toBe(true);
      }
    });

    test("無効なビデオIDを拒否する", () => {
      const invalidIds = [
        "",
        null as any,
        undefined as any,
        123 as any,
        "short",
        "toolongvideoid",
        "invalid!id",
        "invalid@id#",
        "abc def ghi",
      ];

      for (const id of invalidIds) {
        const result = service.validateVideoId(id);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe("UNKNOWN");
        }
      }
    });
  });

  describe("validateLanguageCode", () => {
    describe("有効な言語コードの処理", () => {
      const testCases = [
        // ISO 639-1 (2文字コード)
        { input: "en", expected: "en", description: "ISO 639-1 英語" },
        { input: "ja", expected: "ja", description: "ISO 639-1 日本語" },
        { input: "fr", expected: "fr", description: "ISO 639-1 フランス語" },
        { input: "de", expected: "de", description: "ISO 639-1 ドイツ語" },
        { input: "zh", expected: "zh", description: "ISO 639-1 中国語" },
        { input: "es", expected: "es", description: "ISO 639-1 スペイン語" },
        { input: "pt", expected: "pt", description: "ISO 639-1 ポルトガル語" },
        { input: "ko", expected: "ko", description: "ISO 639-1 韓国語" },
        { input: "hi", expected: "hi", description: "ISO 639-1 ヒンディー語" },
        {
          input: "id",
          expected: "id",
          description: "ISO 639-1 インドネシア語",
        },
        { input: "th", expected: "th", description: "ISO 639-1 タイ語" },

        // ISO 639-2 (3文字コード) - YouTubeで使用される
        {
          input: "fil",
          expected: "fil",
          description: "ISO 639-2 フィリピン語",
        },
        // 注: YouTubeでは"xyz"のような3文字コードも形式的には有効だが、実際には存在しない言語はyt-dlpが拒否する

        // 前後の空白を除去
        {
          input: " ja ",
          expected: "ja",
          description: "前後に空白があるケース",
        },
        { input: "  en  ", expected: "en", description: "複数の空白" },

        // BCP-47形式 (language-Script)
        {
          input: "zh-Hans",
          expected: "zh-Hans",
          description: "BCP-47 簡体字中国語",
        },
        {
          input: "zh-Hant",
          expected: "zh-Hant",
          description: "BCP-47 繁体字中国語",
        },

        // BCP-47形式 (language-REGION)
        { input: "en-US", expected: "en-US", description: "BCP-47 米国英語" },
        { input: "en-GB", expected: "en-GB", description: "BCP-47 英国英語" },
        { input: "ja-JP", expected: "ja-JP", description: "BCP-47 日本語" },
        {
          input: "zh-CN",
          expected: "zh-CN",
          description: "BCP-47 中国語（中国）",
        },
        {
          input: "zh-TW",
          expected: "zh-TW",
          description: "BCP-47 中国語（台湾）",
        },
        {
          input: "fr-CA",
          expected: "fr-CA",
          description: "BCP-47 カナダフランス語",
        },
        {
          input: "pt-BR",
          expected: "pt-BR",
          description: "BCP-47 ブラジルポルトガル語",
        },
        {
          input: "pt-PT",
          expected: "pt-PT",
          description: "BCP-47 ポルトガル語（ポルトガル）",
        },
        {
          input: "de-DE",
          expected: "de-DE",
          description: "BCP-47 ドイツ語（ドイツ）",
        },

        // BCP-47形式 (language-NUMBER) - ラテンアメリカスペイン語
        {
          input: "es-419",
          expected: "es-419",
          description: "BCP-47 ラテンアメリカスペイン語",
        },
      ];

      testCases.forEach(({ input, expected, description }) => {
        test(description, () => {
          const result = service.validateLanguageCode(input);
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.value).toBe(expected);
          }
        });
      });
    });

    describe("無効な言語コードの処理", () => {
      const invalidCases = [
        // 基本的なバリデーションエラー
        {
          input: "",
          description: "空文字列",
          expectedMessage: "non-empty string",
        },
        {
          input: null as any,
          description: "null",
          expectedMessage: "non-empty string",
        },
        {
          input: undefined as any,
          description: "undefined",
          expectedMessage: "non-empty string",
        },
        {
          input: 123 as any,
          description: "数値",
          expectedMessage: "non-empty string",
        },
        {
          input: "   ",
          description: "空白のみ",
          expectedMessage: "cannot be empty",
        },

        // フォーマットエラー
        {
          input: "xxxx",
          description: "4文字以上のコード",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "x",
          description: "1文字のみ",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "12",
          description: "数字のみ",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "EN",
          description: "大文字のISO 639-1",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "En",
          description: "混在ケース",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "en-us",
          description: "小文字の地域コード",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "zh-hans",
          description: "小文字のスクリプト",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "en_US",
          description: "アンダースコア区切り",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "en-USA",
          description: "3文字の地域コード",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "engl-US",
          description: "4文字と地域の組み合わせ",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "-US",
          description: "言語コードなし",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "en-",
          description: "地域コードなし",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "!!!!",
          description: "特殊文字のみ",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "en.US",
          description: "ドット区切り",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "en US",
          description: "スペース区切り",
          expectedMessage: "Invalid language code format",
        },

        // コマンドインジェクションの試み
        {
          input: "en; rm -rf /",
          description: "コマンドインジェクション試行",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "en && echo hacked",
          description: "コマンドチェイン",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "en.*",
          description: "正規表現パターン",
          expectedMessage: "Invalid language code format",
        },
        {
          input: "$(whoami)",
          description: "コマンド置換",
          expectedMessage: "Invalid language code format",
        },
      ];

      invalidCases.forEach(({ input, description, expectedMessage }) => {
        test(description, () => {
          const result = service.validateLanguageCode(input);
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.type).toBe("UNKNOWN");
            expect(result.error.message).toContain(expectedMessage);
          }
        });
      });
    });
  });

  describe("mapParsedEntriesToSegments", () => {
    const mockParsedResult = {
      entries: [
        { id: "1", from: 0, to: 3000, text: "First segment" },
        { id: "2", from: 3000, to: 6000, text: "Second segment" },
        { id: "3", from: 6000, to: 9000, text: "Third segment" },
        { id: "4", from: 9000, to: 12000, text: "Fourth segment" },
      ],
    };

    test("全てのエントリを変換する（時間範囲指定なし）", () => {
      const segments = service.mapParsedEntriesToSegments(mockParsedResult);

      expect(segments).toHaveLength(4);
      expect(segments[0]).toStrictEqual({
        start: 0,
        end: 3,
        text: "First segment",
      });
      expect(segments[3]).toStrictEqual({
        start: 9,
        end: 12,
        text: "Fourth segment",
      });
    });

    test("開始時間でフィルタリング", () => {
      const segments = service.mapParsedEntriesToSegments(
        mockParsedResult,
        5, // 5秒以降
        undefined,
      );

      expect(segments).toHaveLength(3);
      expect(segments[0]?.text).toBe("Second segment");
    });

    test("終了時間でフィルタリング", () => {
      const segments = service.mapParsedEntriesToSegments(
        mockParsedResult,
        undefined,
        7, // 7秒まで
      );

      expect(segments).toHaveLength(3);
      expect(segments[segments.length - 1]?.text).toBe("Third segment");
    });

    test("開始時間と終了時間の両方でフィルタリング", () => {
      const segments = service.mapParsedEntriesToSegments(
        mockParsedResult,
        2, // 2秒から
        8, // 8秒まで
      );

      expect(segments).toHaveLength(3);
      expect(segments[0]?.text).toBe("First segment");
      expect(segments[2]?.text).toBe("Third segment");
    });

    test("テキストの前後の空白を削除", () => {
      const parsedWithSpaces = {
        entries: [
          { id: "1", from: 0, to: 1000, text: "  Trimmed text  " },
          { id: "2", from: 1000, to: 2000, text: "\n\tTabbed\n" },
        ],
      };

      const segments = service.mapParsedEntriesToSegments(parsedWithSpaces);

      expect(segments[0]?.text).toBe("Trimmed text");
      expect(segments[1]?.text).toBe("Tabbed");
    });

    test("空のエントリリストを処理", () => {
      const emptyParsed = { entries: [] };
      const segments = service.mapParsedEntriesToSegments(emptyParsed);

      expect(segments).toHaveLength(0);
    });
  });

  describe("downloadSubtitleWithYtdlp", () => {
    const videoId = "test123";
    const languageCode = "en";
    const outputPath = "/tmp/subtitle_test";

    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
    });

    test("字幕のダウンロードに成功", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);
      mockExistsSync.mockReturnValue(true);

      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      const result = await service.downloadSubtitleWithYtdlp(
        videoId,
        languageCode,
        outputPath,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(`${outputPath}.${languageCode}.vtt`);
      }

      expect(mockSpawn).toHaveBeenCalledWith(
        "yt-dlp",
        [
          "--write-subs",
          "--write-auto-subs",
          "--skip-download",
          "--sub-format",
          "vtt",
          "--sub-langs",
          languageCode,
          "--output",
          outputPath,
          `https://www.youtube.com/watch?v=${videoId}`,
        ],
        expect.objectContaining({
          env: expect.objectContaining({ PYTHONWARNINGS: "ignore" }),
        }),
      );
    });

    test("字幕ファイルが作成されない場合", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);
      mockExistsSync.mockReturnValue(false);

      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      const result = await service.downloadSubtitleWithYtdlp(
        videoId,
        languageCode,
        outputPath,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("NO_SUBTITLES");
        expect(result.error.message).toContain(
          `No subtitles available for language: ${languageCode}`,
        );
      }
    });

    test("yt-dlpがエラーコードで終了", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      setTimeout(() => {
        const stderrCall = mockChild.stderr.on.mock.calls.find(
          (call: unknown[]) => call[0] === "data",
        ) as [string, (data: Buffer) => void] | undefined;
        if (stderrCall) {
          stderrCall[1](Buffer.from("ERROR: Some error occurred"));
        }
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 0);

      const result = await service.downloadSubtitleWithYtdlp(
        videoId,
        languageCode,
        outputPath,
      );

      expect(result.ok).toBe(false);
    });

    test("spawnエラーの処理", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      setTimeout(() => {
        const errorCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "error",
        ) as [string, () => void] | undefined;
        if (errorCall) {
          errorCall[1]();
        }
      }, 0);

      const result = await service.downloadSubtitleWithYtdlp(
        videoId,
        languageCode,
        outputPath,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("UNKNOWN");
      }
    });
  });

  describe("parseYtdlpError", () => {
    test("動画が利用不可のエラー", () => {
      const error = service.parseYtdlpError(
        "ERROR: [youtube] abc123: Video unavailable",
        "abc123",
        "en",
        1,
      );

      expect(error.type).toBe("VIDEO_UNAVAILABLE");
      expect(error.message).toContain("Video not found or unavailable");
      expect(error.message).toContain("abc123");
    });

    test("レート制限エラー", () => {
      const error = service.parseYtdlpError(
        "ERROR: HTTP Error 429: Too Many Requests",
        "test",
        "en",
        1,
      );

      expect(error.type).toBe("RATE_LIMITED");
      expect(error.message).toContain("Rate limited");
    });

    test("字幕が存在しないエラー", () => {
      const testCases = [
        "There are no subtitles for this video",
        "ERROR: no subtitles found",
      ];

      for (const stderr of testCases) {
        const error = service.parseYtdlpError(stderr, "test", "ja", 1);
        expect(error.type).toBe("NO_SUBTITLES");
        expect(error.message).toContain(
          "No subtitles available for language: ja",
        );
      }
    });

    test("不明なエラー", () => {
      const error = service.parseYtdlpError(
        "Some unknown error",
        "test",
        "en",
        255,
      );

      expect(error.type).toBe("UNKNOWN");
      expect(error.message).toContain("Some unknown error");
    });

    test("空のstderrの場合", () => {
      const error = service.parseYtdlpError("", "test", "en", 1);

      expect(error.type).toBe("UNKNOWN");
      expect(error.message).toContain("yt-dlp exited with code 1");
    });
  });

  describe("getTranscript", () => {
    const mockVttContent = `WEBVTT
Kind: captions
Language: en

00:00:00.840 --> 00:00:03.629
We're no strangers to love

00:00:03.639 --> 00:00:06.670
You know the rules and so do I`;

    beforeEach(() => {
      mockMkdtempSync.mockReturnValue("/tmp/yt-dlp-test");
      mockReadFileSync.mockReturnValue(mockVttContent);
      mockExistsSync.mockReturnValue(true);
    });

    test("字幕を正常に取得できる", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn
        .mockReturnValueOnce(mockChild1) // checkYtdlpInstalled
        .mockReturnValueOnce(mockChild2); // downloadSubtitleWithYtdlp

      // yt-dlp installed check
      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      // subtitle download success
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

      // 一時ディレクトリのクリーンアップが呼ばれたことを確認
      expect(mockRmSync).toHaveBeenCalledWith("/tmp/yt-dlp-test", {
        recursive: true,
        force: true,
      });
    });

    test("yt-dlpがインストールされていない場合", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      // yt-dlp not installed
      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 0);

      await expect(service.getTranscript("test", "en")).rejects.toThrow(
        "yt-dlp is not installed",
      );
    });

    test("無効なビデオIDの場合", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      // yt-dlp installed
      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      await expect(service.getTranscript("invalid!", "en")).rejects.toThrow(
        "Invalid video ID format",
      );
    });

    test("無効な言語コード形式の場合", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      // yt-dlp installed check
      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      // 無効な形式の言語コードはvalidateLanguageCodeで拒否される
      await expect(service.getTranscript("dQw4w9WgXcQ", "EN")).rejects.toThrow(
        "Invalid language code format",
      );
    });

    test("有効な言語コード形式だがyt-dlpで失敗する場合", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      // yt-dlp installed
      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      // xyz は形式的には有効な3文字コードなので、バリデーションを通過する
      // yt-dlpで実際のダウンロードが失敗することを確認
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild).mockReturnValueOnce(mockChild2);

      // yt-dlp download will fail with "no subtitles" error
      setTimeout(() => {
        const stderrCall = mockChild2.stderr.on.mock.calls.find(
          (call: unknown[]) => call[0] === "data",
        ) as [string, (data: Buffer) => void] | undefined;
        if (stderrCall) {
          stderrCall[1](
            Buffer.from(
              "ERROR: There are no subtitles for the requested languages",
            ),
          );
        }

        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1); // exit with error
        }
      }, 0);

      await expect(service.getTranscript("dQw4w9WgXcQ", "xyz")).rejects.toThrow(
        "No subtitles available for language: xyz",
      );
    });

    test("一時ディレクトリのクリーンアップエラーを無視", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      mockRmSync.mockImplementation(() => {
        throw new Error("Cleanup failed");
      });

      // yt-dlp installed check
      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      // subtitle download success
      setTimeout(() => {
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 10);

      // クリーンアップエラーがあっても正常に完了することを確認
      const result = await service.getTranscript("dQw4w9WgXcQ", "en");
      expect(result.segments).toHaveLength(2);
    });

    test("字幕ダウンロード失敗時もクリーンアップが実行される", async () => {
      const mockChild1 = createMockChildProcess();
      const mockChild2 = createMockChildProcess();
      mockSpawn.mockReturnValueOnce(mockChild1).mockReturnValueOnce(mockChild2);

      // yt-dlp installed check
      setTimeout(() => {
        const closeCall = mockChild1.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      // subtitle download failure
      setTimeout(() => {
        const stderrCall = mockChild2.stderr.on.mock.calls.find(
          (call: unknown[]) => call[0] === "data",
        ) as [string, (data: Buffer) => void] | undefined;
        if (stderrCall) {
          stderrCall[1](Buffer.from("ERROR: Video unavailable"));
        }
        const closeCall = mockChild2.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 10);

      await expect(
        service.getTranscript("dQw4w9WgXcQ", "en"),
      ).rejects.toThrow();

      // エラーの場合でもクリーンアップが呼ばれることを確認
      expect(mockRmSync).toHaveBeenCalledWith("/tmp/yt-dlp-test", {
        recursive: true,
        force: true,
      });
    });
  });
});
