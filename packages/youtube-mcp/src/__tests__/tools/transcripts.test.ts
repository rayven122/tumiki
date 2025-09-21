import type { YouTubeApiService } from "@/services/YoutubeApiService/index.js";
import type { YtdlpService } from "@/services/YtdlpService/index.js";
import type { TranscriptMetadata, TranscriptResponse } from "@/types/index.js";
import { YOU_TUBE_TOOL_NAMES } from "@/constants/toolNames.js";
import { handleTranscriptTool, transcriptTools } from "@/tools/transcripts.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

describe("transcriptTools", () => {
  let mockYoutubeApi: Partial<YouTubeApiService>;
  let mockYtdlpService: Partial<YtdlpService>;

  beforeEach(() => {
    mockYoutubeApi = {
      getTranscriptMetadata: vi.fn(),
    };
    mockYtdlpService = {
      getTranscript: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe("ツール定義", () => {
    test("2つの字幕ツールが定義されている", () => {
      expect(transcriptTools).toHaveLength(2);
      expect(transcriptTools[0]?.name).toBe(
        YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT_METADATA,
      );
      expect(transcriptTools[1]?.name).toBe(YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT);
    });

    test("GET_TRANSCRIPT_METADATAツールの定義が正しい", () => {
      const tool = transcriptTools[0];
      expect(tool).toMatchObject({
        name: YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT_METADATA,
        description: expect.stringContaining("字幕のメタデータ"),
        inputSchema: {
          type: "object",
          properties: {
            videoId: {
              type: "string",
              description: "YouTube動画のID",
            },
          },
          required: ["videoId"],
        },
      });
    });
  });

  describe("handleTranscriptTool", () => {
    describe("GET_TRANSCRIPT_METADATA", () => {
      test("正常系: 字幕メタデータを取得する", async () => {
        const mockMetadata: TranscriptMetadata[] = [
          {
            id: "test-id",
            language: "ja",
            name: "日本語",
            trackKind: "standard",
            isAutoSynced: false,
            lastUpdated: "2024-01-01T00:00:00Z",
          },
        ];

        vi.mocked(mockYoutubeApi.getTranscriptMetadata!).mockResolvedValue(
          mockMetadata,
        );

        const result = await handleTranscriptTool(
          YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT_METADATA,
          { videoId: "test-video-id" },
          mockYoutubeApi as YouTubeApiService,
          mockYtdlpService as YtdlpService,
        );

        expect(mockYoutubeApi.getTranscriptMetadata).toHaveBeenCalledWith(
          "test-video-id",
        );

        const textContent = result.content[0] as { type: string; text: string };
        expect(textContent.type).toBe("text");

        const parsed = JSON.parse(textContent.text) as TranscriptMetadata[];
        expect(parsed).toHaveLength(1);
        expect(parsed[0]).toMatchObject({
          id: "test-id",
          language: "ja",
          name: "日本語",
        });
      });

      test("正常系: 字幕が存在しない場合", async () => {
        vi.mocked(mockYoutubeApi.getTranscriptMetadata!).mockResolvedValue([]);

        const result = await handleTranscriptTool(
          YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT_METADATA,
          { videoId: "test-video-id" },
          mockYoutubeApi as YouTubeApiService,
          mockYtdlpService as YtdlpService,
        );

        const textContent = result.content[0] as { type: string; text: string };
        const parsed = JSON.parse(textContent.text) as TranscriptMetadata[];
        expect(parsed).toEqual([]);
      });

      test("異常系: videoIdが指定されていない", async () => {
        const result = await handleTranscriptTool(
          YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT_METADATA,
          {},
          mockYoutubeApi as YouTubeApiService,
          mockYtdlpService as YtdlpService,
        );

        const textContent = result.content[0] as { type: string; text: string };
        const parsed = JSON.parse(textContent.text) as { error: string };
        expect(parsed.error).toBeDefined();
      });
    });

    describe("GET_TRANSCRIPT", () => {
      test("正常系: 字幕を取得する", async () => {
        const mockTranscript: TranscriptResponse = {
          segments: [
            {
              start: 0,
              end: 3,
              text: "Test transcript",
            },
          ],
        };

        vi.mocked(mockYtdlpService.getTranscript!).mockResolvedValue(
          mockTranscript,
        );

        const result = await handleTranscriptTool(
          YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT,
          { videoId: "test-video-id", language: "en" },
          mockYoutubeApi as YouTubeApiService,
          mockYtdlpService as YtdlpService,
        );

        expect(mockYtdlpService.getTranscript).toHaveBeenCalledWith(
          "test-video-id",
          "en",
          undefined,
          undefined,
        );

        const textContent = result.content[0] as { type: string; text: string };
        expect(textContent.type).toBe("text");

        const parsed = JSON.parse(textContent.text) as TranscriptResponse;
        expect(parsed.segments).toHaveLength(1);
        expect(parsed.segments[0]).toMatchObject({
          start: 0,
          end: 3,
          text: "Test transcript",
        });
      });

      test("正常系: 時間範囲指定で字幕を取得する", async () => {
        const mockTranscript: TranscriptResponse = {
          segments: [
            {
              start: 10,
              end: 15,
              text: "Filtered transcript",
            },
          ],
        };

        vi.mocked(mockYtdlpService.getTranscript!).mockResolvedValue(
          mockTranscript,
        );

        const result = await handleTranscriptTool(
          YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT,
          {
            videoId: "test-video-id",
            language: "en",
            startTime: 10,
            endTime: 20,
          },
          mockYoutubeApi as YouTubeApiService,
          mockYtdlpService as YtdlpService,
        );

        expect(mockYtdlpService.getTranscript).toHaveBeenCalledWith(
          "test-video-id",
          "en",
          10,
          20,
        );

        const textContent = result.content[0] as { type: string; text: string };
        const parsed = JSON.parse(textContent.text) as TranscriptResponse;
        expect(parsed.segments[0]?.text).toBe("Filtered transcript");
      });

      test("異常系: 必須パラメータが不足している", async () => {
        const result = await handleTranscriptTool(
          YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT,
          { videoId: "test-video-id" }, // languageが不足
          mockYoutubeApi as YouTubeApiService,
          mockYtdlpService as YtdlpService,
        );

        const textContent = result.content[0] as { type: string; text: string };
        const parsed = JSON.parse(textContent.text) as { error: string };
        expect(parsed.error).toBeDefined();
      });

      test("異常系: YtdlpServiceがエラーを投げる", async () => {
        vi.mocked(mockYtdlpService.getTranscript!).mockRejectedValue(
          new Error("No subtitles available for language: xx"),
        );

        const result = await handleTranscriptTool(
          YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT,
          { videoId: "test-video-id", language: "xx" },
          mockYoutubeApi as YouTubeApiService,
          mockYtdlpService as YtdlpService,
        );

        const textContent = result.content[0] as { type: string; text: string };
        const parsed = JSON.parse(textContent.text) as { error: string };
        expect(parsed.error).toContain(
          "No subtitles available for language: xx",
        );
      });
    });

    test("異常系: 不明なツール名", async () => {
      const result = await handleTranscriptTool(
        "unknown-tool",
        {},
        mockYoutubeApi as YouTubeApiService,
        mockYtdlpService as YtdlpService,
      );

      const textContent = result.content[0] as { type: string; text: string };
      const parsed = JSON.parse(textContent.text) as { error: string };
      expect(parsed.error).toContain("Unknown transcript tool");
    });

    test("異常系: Error以外の値がthrowされた場合", async () => {
      // getTranscriptMetadataがError以外の値をthrowするようにモック
      vi.mocked(mockYoutubeApi.getTranscriptMetadata!).mockRejectedValue(
        "string error",
      );

      const result = await handleTranscriptTool(
        YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT_METADATA,
        { videoId: "test-video-id" },
        mockYoutubeApi as YouTubeApiService,
        mockYtdlpService as YtdlpService,
      );

      const textContent = result.content[0] as { type: string; text: string };
      const parsed = JSON.parse(textContent.text) as { error: string };
      expect(parsed.error).toBe("string error");
    });
  });
});
