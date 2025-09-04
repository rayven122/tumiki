import type { YouTubeApiService } from "@/services/youtubeApi.js";
import type { SearchResult, VideoDetails } from "@/types/index.js";
import { handleVideoTool } from "@/tools/videos.js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ZodError } from "zod";

// YouTubeApiServiceをモック化
const mockGetVideo = vi.fn();
const mockSearchVideos = vi.fn();

const createMockYouTubeApiService = (): YouTubeApiService =>
  ({
    getVideo: mockGetVideo,
    searchVideos: mockSearchVideos,
    getChannel: vi.fn(),
    listChannelVideos: vi.fn(),
    getPlaylist: vi.fn(),
    getPlaylistItems: vi.fn(),
  }) as any;

describe("handleVideoTool", () => {
  let mockYouTubeApiService: YouTubeApiService;

  beforeEach(() => {
    mockYouTubeApiService = createMockYouTubeApiService();
    mockGetVideo.mockClear();
    mockSearchVideos.mockClear();
  });

  describe("youtube_get_video", () => {
    const mockVideoDetails: VideoDetails = {
      id: "test-video-id",
      title: "テスト動画",
      description: "テスト動画の説明",
      channelId: "test-channel-id",
      channelTitle: "テストチャンネル",
      publishedAt: "2023-01-01T00:00:00Z",
      duration: "PT10M30S",
      viewCount: "1000",
      likeCount: "100",
      commentCount: "10",
      thumbnails: {
        default: {
          url: "https://example.com/thumb.jpg",
          width: 120,
          height: 90,
        },
      },
      tags: ["test", "video"],
      categoryId: "22",
    };

    test("正常系: videoIdのみで動画情報を取得する", async () => {
      mockGetVideo.mockResolvedValueOnce(mockVideoDetails);

      const result = await handleVideoTool(
        "youtube_get_video",
        { videoId: "test-video-id" },
        mockYouTubeApiService,
      );

      expect(mockGetVideo).toHaveBeenCalledWith("test-video-id", undefined);
      expect(result).toStrictEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockVideoDetails, null, 2),
          },
        ],
      });
    });

    test("正常系: videoIdとpartsパラメータで動画情報を取得する", async () => {
      mockGetVideo.mockResolvedValueOnce(mockVideoDetails);

      const result = await handleVideoTool(
        "youtube_get_video",
        {
          videoId: "test-video-id",
          parts: ["snippet", "statistics"],
        },
        mockYouTubeApiService,
      );

      expect(mockGetVideo).toHaveBeenCalledWith("test-video-id", [
        "snippet",
        "statistics",
      ]);
      expect(result).toStrictEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockVideoDetails, null, 2),
          },
        ],
      });
    });

    test("異常系: videoIdが不正な場合にZodErrorが発生する", async () => {
      await expect(
        handleVideoTool(
          "youtube_get_video",
          { videoId: 123 },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetVideo).not.toHaveBeenCalled();
    });

    test("異常系: videoIdが空文字列の場合にZodErrorが発生する", async () => {
      await expect(
        handleVideoTool(
          "youtube_get_video",
          { videoId: "" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetVideo).not.toHaveBeenCalled();
    });

    test("異常系: videoIdが未定義の場合にZodErrorが発生する", async () => {
      await expect(
        handleVideoTool("youtube_get_video", {}, mockYouTubeApiService),
      ).rejects.toThrow(ZodError);

      expect(mockGetVideo).not.toHaveBeenCalled();
    });

    test("異常系: partsに不正な値が含まれる場合にZodErrorが発生する", async () => {
      await expect(
        handleVideoTool(
          "youtube_get_video",
          {
            videoId: "test-video-id",
            parts: ["invalid-part"],
          },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetVideo).not.toHaveBeenCalled();
    });

    test("異常系: YouTubeApiServiceでエラーが発生した場合", async () => {
      const apiError = new Error("API Error");
      mockGetVideo.mockRejectedValueOnce(apiError);

      await expect(
        handleVideoTool(
          "youtube_get_video",
          { videoId: "test-video-id" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow("API Error");

      expect(mockGetVideo).toHaveBeenCalledWith("test-video-id", undefined);
    });
  });

  describe("youtube_search_videos", () => {
    const mockSearchResults: SearchResult[] = [
      {
        id: "search-video-id-1",
        title: "検索結果動画1",
        description: "検索結果の説明1",
        channelId: "search-channel-id-1",
        channelTitle: "検索チャンネル1",
        publishedAt: "2023-01-01T00:00:00Z",
        thumbnails: {
          default: {
            url: "https://example.com/search-thumb1.jpg",
            width: 120,
            height: 90,
          },
        },
        type: "video",
      },
      {
        id: "search-video-id-2",
        title: "検索結果動画2",
        description: "検索結果の説明2",
        channelId: "search-channel-id-2",
        channelTitle: "検索チャンネル2",
        publishedAt: "2023-01-02T00:00:00Z",
        thumbnails: {
          default: {
            url: "https://example.com/search-thumb2.jpg",
            width: 120,
            height: 90,
          },
        },
        type: "video",
      },
    ];

    test("正常系: queryのみで動画を検索する", async () => {
      mockSearchVideos.mockResolvedValueOnce(mockSearchResults);

      const result = await handleVideoTool(
        "youtube_search_videos",
        { query: "test search" },
        mockYouTubeApiService,
      );

      expect(mockSearchVideos).toHaveBeenCalledWith(
        "test search",
        10,
        "relevance",
        "video",
      );
      expect(result).toStrictEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockSearchResults, null, 2),
          },
        ],
      });
    });

    test("正常系: 全てのパラメータを指定して動画を検索する", async () => {
      mockSearchVideos.mockResolvedValueOnce(mockSearchResults);

      const result = await handleVideoTool(
        "youtube_search_videos",
        {
          query: "test search",
          maxResults: 20,
          order: "date",
          type: "channel",
        },
        mockYouTubeApiService,
      );

      expect(mockSearchVideos).toHaveBeenCalledWith(
        "test search",
        20,
        "date",
        "channel",
      );
      expect(result).toStrictEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockSearchResults, null, 2),
          },
        ],
      });
    });

    test("正常系: maxResultsの境界値（最小値1）で動画を検索する", async () => {
      mockSearchVideos.mockResolvedValueOnce([mockSearchResults[0]!]);

      await handleVideoTool(
        "youtube_search_videos",
        {
          query: "test search",
          maxResults: 1,
        },
        mockYouTubeApiService,
      );

      expect(mockSearchVideos).toHaveBeenCalledWith(
        "test search",
        1,
        "relevance",
        "video",
      );
    });

    test("正常系: maxResultsの境界値（最大値50）で動画を検索する", async () => {
      mockSearchVideos.mockResolvedValueOnce(mockSearchResults);

      await handleVideoTool(
        "youtube_search_videos",
        {
          query: "test search",
          maxResults: 50,
        },
        mockYouTubeApiService,
      );

      expect(mockSearchVideos).toHaveBeenCalledWith(
        "test search",
        50,
        "relevance",
        "video",
      );
    });

    test("正常系: orderのすべての有効な値でテストする", async () => {
      const orderValues = [
        "relevance",
        "date",
        "rating",
        "viewCount",
        "title",
      ] as const;

      for (const order of orderValues) {
        mockSearchVideos.mockResolvedValueOnce(mockSearchResults);

        await handleVideoTool(
          "youtube_search_videos",
          {
            query: "test search",
            order,
          },
          mockYouTubeApiService,
        );

        expect(mockSearchVideos).toHaveBeenCalledWith(
          "test search",
          10,
          order,
          "video",
        );
      }

      expect(mockSearchVideos).toHaveBeenCalledTimes(orderValues.length);
    });

    test("正常系: typeのすべての有効な値でテストする", async () => {
      const typeValues = ["video", "channel", "playlist"] as const;

      for (const type of typeValues) {
        mockSearchVideos.mockResolvedValueOnce(mockSearchResults);

        await handleVideoTool(
          "youtube_search_videos",
          {
            query: "test search",
            type,
          },
          mockYouTubeApiService,
        );

        expect(mockSearchVideos).toHaveBeenCalledWith(
          "test search",
          10,
          "relevance",
          type,
        );
      }

      expect(mockSearchVideos).toHaveBeenCalledTimes(typeValues.length);
    });

    test("異常系: queryが不正な場合にZodErrorが発生する", async () => {
      await expect(
        handleVideoTool(
          "youtube_search_videos",
          { query: 123 },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockSearchVideos).not.toHaveBeenCalled();
    });

    test("異常系: queryが空文字列の場合にZodErrorが発生する", async () => {
      await expect(
        handleVideoTool(
          "youtube_search_videos",
          { query: "" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockSearchVideos).not.toHaveBeenCalled();
    });

    test("異常系: queryが未定義の場合にZodErrorが発生する", async () => {
      await expect(
        handleVideoTool("youtube_search_videos", {}, mockYouTubeApiService),
      ).rejects.toThrow(ZodError);

      expect(mockSearchVideos).not.toHaveBeenCalled();
    });

    test("異常系: maxResultsが範囲外（0）の場合にZodErrorが発生する", async () => {
      await expect(
        handleVideoTool(
          "youtube_search_videos",
          {
            query: "test search",
            maxResults: 0,
          },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockSearchVideos).not.toHaveBeenCalled();
    });

    test("異常系: maxResultsが範囲外（51）の場合にZodErrorが発生する", async () => {
      await expect(
        handleVideoTool(
          "youtube_search_videos",
          {
            query: "test search",
            maxResults: 51,
          },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockSearchVideos).not.toHaveBeenCalled();
    });

    test("異常系: orderが不正な値の場合にZodErrorが発生する", async () => {
      await expect(
        handleVideoTool(
          "youtube_search_videos",
          {
            query: "test search",
            order: "invalid-order",
          },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockSearchVideos).not.toHaveBeenCalled();
    });

    test("異常系: typeが不正な値の場合にZodErrorが発生する", async () => {
      await expect(
        handleVideoTool(
          "youtube_search_videos",
          {
            query: "test search",
            type: "invalid-type",
          },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockSearchVideos).not.toHaveBeenCalled();
    });

    test("異常系: YouTubeApiServiceでエラーが発生した場合", async () => {
      const apiError = new Error("Search API Error");
      mockSearchVideos.mockRejectedValueOnce(apiError);

      await expect(
        handleVideoTool(
          "youtube_search_videos",
          { query: "test search" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow("Search API Error");

      expect(mockSearchVideos).toHaveBeenCalledWith(
        "test search",
        10,
        "relevance",
        "video",
      );
    });
  });

  describe("unknown tool", () => {
    test("異常系: 未知のツール名の場合にエラーが発生する", async () => {
      await expect(
        handleVideoTool("unknown_tool", {}, mockYouTubeApiService),
      ).rejects.toThrow("Unknown video tool: unknown_tool");

      expect(mockGetVideo).not.toHaveBeenCalled();
      expect(mockSearchVideos).not.toHaveBeenCalled();
    });
  });
});
