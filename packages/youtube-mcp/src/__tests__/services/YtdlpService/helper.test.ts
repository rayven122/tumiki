import { spawn } from "child_process";
import * as fs from "fs";
import * as helpers from "@/services/YtdlpService/helper.js";
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
  existsSync: vi.fn(),
}));

const mockSpawn = vi.mocked(spawn);
const mockExistsSync = vi.mocked(fs.existsSync);

describe("YtdlpService Helper Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkYtdlpInstalled", () => {
    test("yt-dlpがインストールされている場合はokを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild as any);

      // 正常終了をシミュレート
      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      const result = await helpers.checkYtdlpInstalled();
      expect(result.ok).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith("yt-dlp", ["--version"]);
    });

    test("yt-dlpがインストールされていない場合はエラーを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild as any);

      // エラーコードで終了
      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 0);

      const result = await helpers.checkYtdlpInstalled();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("NOT_INSTALLED");
        expect(result.error.message).toContain("yt-dlp is not installed");
      }
    });

    test("spawnがエラーを投げた場合はNOT_INSTALLEDエラーを返す", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild as any);

      // エラーイベントを発火
      setTimeout(() => {
        const errorCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "error",
        ) as [string, () => void] | undefined;
        if (errorCall) {
          errorCall[1]();
        }
      }, 0);

      const result = await helpers.checkYtdlpInstalled();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("NOT_INSTALLED");
      }
    });
  });

  describe("validateVideoId", () => {
    describe("有効なVideo ID", () => {
      test.each([
        ["dQw4w9WgXcQ", "通常のID"],
        ["0-_1_-2_-3_", "ハイフンとアンダースコアを含む"],
        ["ABCDEFGHIJK", "大文字のみ"],
        ["abcdefghijk", "小文字のみ"],
        ["12345678901", "数字のみ"],
      ])("%s を受け入れる（%s）", (id) => {
        const result = helpers.validateVideoId(id);
        expect(result.ok).toBe(true);
      });
    });

    describe("無効なVideo ID", () => {
      test.each([
        ["short", "短すぎる"],
        ["toolongvideoid123", "長すぎる"],
        ["invalid!id", "無効な文字"],
        ["invalid id", "スペースを含む"],
        ["", "空文字列"],
      ])("%s を拒否する（%s）", (id) => {
        const result = helpers.validateVideoId(id);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe("UNKNOWN");
        }
      });
    });

    test("nullやundefinedを拒否する", () => {
      const result1 = helpers.validateVideoId(null as any);
      expect(result1.ok).toBe(false);

      const result2 = helpers.validateVideoId(undefined as any);
      expect(result2.ok).toBe(false);
    });
  });

  describe("validateLanguageCode", () => {
    describe("有効な言語コード", () => {
      test.each([
        // ISO 639-1 (2文字)
        ["en", "en", "ISO 639-1 英語"],
        ["ja", "ja", "ISO 639-1 日本語"],
        ["es", "es", "ISO 639-1 スペイン語"],
        ["fr", "fr", "ISO 639-1 フランス語"],
        ["de", "de", "ISO 639-1 ドイツ語"],
        ["zh", "zh", "ISO 639-1 中国語"],
        ["ko", "ko", "ISO 639-1 韓国語"],
        ["ar", "ar", "ISO 639-1 アラビア語"],

        // ISO 639-2 (3文字)
        ["fil", "fil", "ISO 639-2 フィリピン語"],
        ["tha", "tha", "ISO 639-2 タイ語"],
        ["vie", "vie", "ISO 639-2 ベトナム語"],
        ["msa", "msa", "ISO 639-2 マレー語"],

        // BCP-47 言語-地域
        ["pt-BR", "pt-BR", "BCP-47 ブラジルポルトガル語"],
        ["en-US", "en-US", "BCP-47 米国英語"],
        ["en-GB", "en-GB", "BCP-47 英国英語"],
        ["es-MX", "es-MX", "BCP-47 メキシコスペイン語"],
        ["fr-CA", "fr-CA", "BCP-47 カナダフランス語"],

        // BCP-47 言語-文字体系
        ["zh-Hans", "zh-Hans", "BCP-47 簡体字中国語"],
        ["zh-Hant", "zh-Hant", "BCP-47 繁体字中国語"],
        ["sr-Cyrl", "sr-Cyrl", "BCP-47 キリル文字セルビア語"],
        ["sr-Latn", "sr-Latn", "BCP-47 ラテン文字セルビア語"],

        // BCP-47 言語-数字地域
        ["es-419", "es-419", "BCP-47 ラテンアメリカスペイン語"],
        ["ar-001", "ar-001", "BCP-47 世界アラビア語"],

        // 空白のトリミング
        ["  en  ", "en", "前後の空白をトリム"],
        [" ja ", "ja", "単一空白のトリム"],
      ])("%s を受け入れて %s を返す（%s）", (input, expected, _description) => {
        const result = helpers.validateLanguageCode(input);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toBe(expected);
        }
      });
    });

    describe("無効な言語コード", () => {
      test.each([
        // 基本的なバリデーションエラー
        ["", "non-empty string", "空文字列"],
        ["   ", "cannot be empty", "空白のみ"],

        // フォーマットエラー
        ["e", "Invalid language code format", "1文字のみ"],
        ["english", "Invalid language code format", "長すぎる"],
        ["en_US", "Invalid language code format", "アンダースコア区切り"],
        ["EN", "Invalid language code format", "大文字のISO 639-1"],
        ["en-us", "Invalid language code format", "小文字の地域コード"],
        ["123", "Invalid language code format", "数字のみ"],
        ["en-", "Invalid language code format", "不完全な形式"],
        ["-US", "Invalid language code format", "言語コードなし"],
        ["en--US", "Invalid language code format", "ダブルハイフン"],
        ["en-US-extra", "Invalid language code format", "余分なセグメント"],

        // コマンドインジェクション試行
        [
          "en; rm -rf /",
          "Invalid language code format",
          "コマンドインジェクション",
        ],
        [
          "en && echo hacked",
          "Invalid language code format",
          "コマンドチェイン",
        ],
        ["en.*", "Invalid language code format", "正規表現パターン"],
        ["$(whoami)", "Invalid language code format", "コマンド置換"],
      ])("%s を拒否する（%s）", (input, expectedMessage, _description) => {
        const result = helpers.validateLanguageCode(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe("UNKNOWN");
          expect(result.error.message).toContain(expectedMessage);
        }
      });

      test("nullやundefinedを拒否する", () => {
        const result1 = helpers.validateLanguageCode(null as any);
        expect(result1.ok).toBe(false);
        if (!result1.ok) {
          expect(result1.error.message).toContain("non-empty string");
        }

        const result2 = helpers.validateLanguageCode(undefined as any);
        expect(result2.ok).toBe(false);
        if (!result2.ok) {
          expect(result2.error.message).toContain("non-empty string");
        }
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

    test("VTTエントリを正しくセグメントに変換する", () => {
      const segments = helpers.mapParsedEntriesToSegments(mockParsedResult);

      expect(segments).toHaveLength(4);
      expect(segments[0]).toStrictEqual({
        start: 0,
        end: 3,
        text: "First segment",
      });
      expect(segments[1]).toStrictEqual({
        start: 3,
        end: 6,
        text: "Second segment",
      });
    });

    test("startTimeで結果をフィルタリングする", () => {
      const segments = helpers.mapParsedEntriesToSegments(mockParsedResult, 5);

      // startTime=5秒の場合、endが5秒以降のセグメントが含まれる
      // Second segment: end=6秒 → 含まれる
      // Third segment: end=9秒 → 含まれる
      // Fourth segment: end=12秒 → 含まれる
      expect(segments).toHaveLength(3);
      expect(segments[0]?.text).toBe("Second segment");
      expect(segments[1]?.text).toBe("Third segment");
      expect(segments[2]?.text).toBe("Fourth segment");
    });

    test("endTimeで結果をフィルタリングする", () => {
      const segments = helpers.mapParsedEntriesToSegments(
        mockParsedResult,
        undefined,
        7,
      );

      expect(segments).toHaveLength(3);
      expect(segments[0]?.text).toBe("First segment");
      expect(segments[1]?.text).toBe("Second segment");
      expect(segments[2]?.text).toBe("Third segment");
    });

    test("startTimeとendTimeの両方で結果をフィルタリングする", () => {
      const segments = helpers.mapParsedEntriesToSegments(
        mockParsedResult,
        2,
        7,
      );

      // startTime=2秒、endTime=7秒の場合
      // First segment: start=0, end=3 → end>=2なので含まれる
      // Second segment: start=3, end=6 → 含まれる
      // Third segment: start=6, end=9 → start<=7なので含まれる
      // Fourth segment: start=9, end=12 → start>7なので除外
      expect(segments).toHaveLength(3);
      expect(segments[0]?.text).toBe("First segment");
      expect(segments[1]?.text).toBe("Second segment");
      expect(segments[2]?.text).toBe("Third segment");
    });

    test("空のエントリ配列を処理する", () => {
      const segments = helpers.mapParsedEntriesToSegments({ entries: [] });
      expect(segments).toStrictEqual([]);
    });

    test("テキストの前後の空白をトリムする", () => {
      const parsedWithWhitespace = {
        entries: [{ id: "1", from: 0, to: 3000, text: "  Trimmed text  " }],
      };

      const segments = helpers.mapParsedEntriesToSegments(parsedWithWhitespace);
      expect(segments[0]?.text).toBe("Trimmed text");
    });
  });

  describe("downloadSubtitleWithYtdlp", () => {
    test("字幕のダウンロードに成功した場合", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild as any);
      mockExistsSync.mockReturnValue(true);

      // yt-dlp の成功をシミュレート
      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      const result = await helpers.downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ",
        "en",
        "/tmp/subtitle",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe("/tmp/subtitle.en.vtt");
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
          "en",
          "--output",
          "/tmp/subtitle",
          "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ],
        { env: expect.objectContaining({ PYTHONWARNINGS: "ignore" }) },
      );
    });

    test.each([
      ["invalid", "Invalid video ID format", "無効なVideo ID"],
      [
        "dQw4w9WgXcQ",
        "Invalid language code format",
        "無効な言語コード",
        "INVALID",
      ],
    ])(
      "%s の場合はエラーを返す",
      async (videoId, expectedMessage, _description, language = "en") => {
        const result = await helpers.downloadSubtitleWithYtdlp(
          videoId,
          language,
          "/tmp/subtitle",
        );

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe("UNKNOWN");
          expect(result.error.message).toContain(expectedMessage);
        }
      },
    );

    test("字幕ファイルが作成されなかった場合", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild as any);
      mockExistsSync.mockReturnValue(false);

      // yt-dlp は成功するが、ファイルが作成されない
      setTimeout(() => {
        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](0);
        }
      }, 0);

      const result = await helpers.downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ",
        "ja",
        "/tmp/subtitle",
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("NO_SUBTITLES");
        expect(result.error.message).toContain(
          "No subtitles available for language: ja",
        );
      }
    });

    test("yt-dlpがエラーコードで終了した場合", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild as any);

      // stderr にエラーメッセージを追加
      setTimeout(() => {
        const stderrCall = mockChild.stderr.on.mock.calls.find(
          (call: unknown[]) => call[0] === "data",
        ) as [string, (data: Buffer) => void] | undefined;
        if (stderrCall) {
          stderrCall[1](Buffer.from("Video unavailable"));
        }

        const closeCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "close",
        ) as [string, (code: number) => void] | undefined;
        if (closeCall) {
          closeCall[1](1);
        }
      }, 0);

      const result = await helpers.downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ",
        "en",
        "/tmp/subtitle",
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("VIDEO_UNAVAILABLE");
      }
    });

    test("spawnエラーが発生した場合", async () => {
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild as any);

      // エラーイベントを発火
      setTimeout(() => {
        const errorCall = mockChild.on.mock.calls.find(
          (call: unknown[]) => call[0] === "error",
        ) as [string, () => void] | undefined;
        if (errorCall) {
          errorCall[1]();
        }
      }, 0);

      const result = await helpers.downloadSubtitleWithYtdlp(
        "dQw4w9WgXcQ",
        "en",
        "/tmp/subtitle",
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("UNKNOWN");
        expect(result.error.message).toContain("Failed to execute yt-dlp");
      }
    });
  });

  describe("parseYtdlpError", () => {
    test.each([
      [
        "ERROR: [youtube] Video unavailable",
        "test-id",
        "en",
        1,
        "VIDEO_UNAVAILABLE",
        "Video not found or unavailable",
      ],
      [
        "HTTP Error 429: Too Many Requests",
        "test-id",
        "en",
        1,
        "RATE_LIMITED",
        "Rate limited",
      ],
      [
        "There are no subtitles for the requested languages",
        "test-id",
        "ja",
        1,
        "NO_SUBTITLES",
        "No subtitles available for language: ja",
      ],
      [
        "no subtitles found",
        "test-id",
        "ko",
        1,
        "NO_SUBTITLES",
        "No subtitles available for language: ko",
      ],
      [
        "Some unknown error",
        "test-id",
        "en",
        1,
        "UNKNOWN",
        "Some unknown error",
      ],
      ["", "test-id", "en", 1, "UNKNOWN", "yt-dlp exited with code 1"],
    ])(
      "stderr: %s → type: %s",
      (
        stderr,
        videoId,
        language,
        exitCode,
        expectedType,
        expectedMessagePart,
      ) => {
        const error = helpers.parseYtdlpError(
          stderr,
          videoId,
          language,
          exitCode,
        );
        expect(error.type).toBe(expectedType);
        expect(error.message).toContain(expectedMessagePart);
      },
    );
  });
});
