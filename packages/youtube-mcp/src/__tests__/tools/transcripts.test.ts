import type { YouTubeApiService } from "@/services/youtubeApi.js";
import type { TranscriptMetadata } from "@/types/index.js";
import { YOU_TUBE_TOOL_NAMES } from "@/constants/toolNames.js";
import { handleTranscriptTool, transcriptTools } from "@/tools/transcripts.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

describe("transcriptTools", () => {
  let mockYoutubeApi: Partial<YouTubeApiService>;

  beforeEach(() => {
    mockYoutubeApi = {
      getTranscriptMetadata: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe("ツール定義", () => {
    test("1つの字幕ツールが定義されている", () => {
      expect(transcriptTools).toHaveLength(1);
      expect(transcriptTools[0]?.name).toBe(
        YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT_METADATA,
      );
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
        );

        const textContent = result.content[0] as { type: string; text: string };
        const parsed = JSON.parse(textContent.text) as { error: string };
        expect(parsed.error).toBeDefined();
      });
    });

    test("異常系: 不明なツール名", async () => {
      const result = await handleTranscriptTool(
        "unknown-tool",
        {},
        mockYoutubeApi as YouTubeApiService,
      );

      const textContent = result.content[0] as { type: string; text: string };
      const parsed = JSON.parse(textContent.text) as { error: string };
      expect(parsed.error).toContain("Unknown transcript tool");
    });
  });
});
