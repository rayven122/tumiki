import { beforeEach, describe, expect, test, vi } from "vitest";
import { ZodError } from "zod";

import type { YouTubeApiService } from "~/services/youtubeApi.js";
import type { ChannelDetails, SearchResult } from "~/types/index.js";
import { handleChannelTool } from "~/tools/channels.js";

// YouTubeApiServiceをモック化
const mockGetChannel = vi.fn();
const mockListChannelVideos = vi.fn();

const createMockYouTubeApiService = (): YouTubeApiService =>
  ({
    getVideo: vi.fn(),
    searchVideos: vi.fn(),
    getChannel: mockGetChannel,
    listChannelVideos: mockListChannelVideos,
    getPlaylist: vi.fn(),
    getPlaylistItems: vi.fn(),
  }) as any;

describe("handleChannelTool", () => {
  let mockYouTubeApiService: YouTubeApiService;

  beforeEach(() => {
    mockYouTubeApiService = createMockYouTubeApiService();
    mockGetChannel.mockClear();
    mockListChannelVideos.mockClear();
  });

  describe("youtube_get_channel", () => {
    const mockChannelDetails: ChannelDetails = {
      id: "test-channel-id",
      title: "テストチャンネル",
      description: "テストチャンネルの説明",
      customUrl: "@testchannel",
      publishedAt: "2020-01-01T00:00:00Z",
      thumbnails: {
        default: {
          url: "https://example.com/channel-thumb.jpg",
          width: 88,
          height: 88,
        },
        medium: {
          url: "https://example.com/channel-thumb-medium.jpg",
          width: 240,
          height: 240,
        },
        high: {
          url: "https://example.com/channel-thumb-high.jpg",
          width: 800,
          height: 800,
        },
      },
      statistics: {
        viewCount: "10000",
        subscriberCount: "1000",
        hiddenSubscriberCount: false,
        videoCount: "100",
      },
      country: "JP",
    };

    test("正常系: チャンネル情報を取得する", async () => {
      mockGetChannel.mockResolvedValueOnce(mockChannelDetails);

      const result = await handleChannelTool(
        "youtube_get_channel",
        { channelId: "test-channel-id" },
        mockYouTubeApiService,
      );

      expect(mockGetChannel).toHaveBeenCalledWith("test-channel-id");
      expect(result).toStrictEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockChannelDetails, null, 2),
          },
        ],
      });
    });

    test("異常系: channelIdが不正な場合にZodErrorが発生する", async () => {
      await expect(
        handleChannelTool(
          "youtube_get_channel",
          { channelId: 123 },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetChannel).not.toHaveBeenCalled();
    });

    test("異常系: channelIdが空文字列の場合にZodErrorが発生する", async () => {
      await expect(
        handleChannelTool(
          "youtube_get_channel",
          { channelId: "" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetChannel).not.toHaveBeenCalled();
    });

    test("異常系: channelIdが未定義の場合にZodErrorが発生する", async () => {
      await expect(
        handleChannelTool("youtube_get_channel", {}, mockYouTubeApiService),
      ).rejects.toThrow(ZodError);

      expect(mockGetChannel).not.toHaveBeenCalled();
    });

    test("異常系: YouTubeApiServiceでエラーが発生した場合", async () => {
      const apiError = new Error("Channel API Error");
      mockGetChannel.mockRejectedValueOnce(apiError);

      await expect(
        handleChannelTool(
          "youtube_get_channel",
          { channelId: "test-channel-id" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow("Channel API Error");

      expect(mockGetChannel).toHaveBeenCalledWith("test-channel-id");
    });
  });

  describe("youtube_list_channel_videos", () => {
    const mockChannelVideos: SearchResult[] = [
      {
        id: "channel-video-id-1",
        title: "チャンネル動画1",
        description: "チャンネル動画の説明1",
        channelId: "test-channel-id",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-01-01T00:00:00Z",
        thumbnails: {
          default: {
            url: "https://example.com/video-thumb1.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://example.com/video-thumb1-medium.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://example.com/video-thumb1-high.jpg",
            width: 480,
            height: 360,
          },
        },
        type: "video",
      },
      {
        id: "channel-video-id-2",
        title: "チャンネル動画2",
        description: "チャンネル動画の説明2",
        channelId: "test-channel-id",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-01-02T00:00:00Z",
        thumbnails: {
          default: {
            url: "https://example.com/video-thumb2.jpg",
            width: 120,
            height: 90,
          },
        },
        type: "video",
      },
    ];

    test("正常系: デフォルトパラメータでチャンネル動画一覧を取得する", async () => {
      mockListChannelVideos.mockResolvedValueOnce(mockChannelVideos);

      const result = await handleChannelTool(
        "youtube_list_channel_videos",
        { channelId: "test-channel-id" },
        mockYouTubeApiService,
      );

      expect(mockListChannelVideos).toHaveBeenCalledWith(
        "test-channel-id",
        10,
        "date",
      );
      expect(result).toStrictEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockChannelVideos, null, 2),
          },
        ],
      });
    });

    test("正常系: 全てのパラメータを指定してチャンネル動画一覧を取得する", async () => {
      mockListChannelVideos.mockResolvedValueOnce(mockChannelVideos);

      const result = await handleChannelTool(
        "youtube_list_channel_videos",
        {
          channelId: "test-channel-id",
          maxResults: 25,
          order: "viewCount",
        },
        mockYouTubeApiService,
      );

      expect(mockListChannelVideos).toHaveBeenCalledWith(
        "test-channel-id",
        25,
        "viewCount",
      );
      expect(result).toStrictEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockChannelVideos, null, 2),
          },
        ],
      });
    });

    test("正常系: maxResultsの境界値（最小値1）でチャンネル動画一覧を取得する", async () => {
      mockListChannelVideos.mockResolvedValueOnce([mockChannelVideos[0]!]);

      await handleChannelTool(
        "youtube_list_channel_videos",
        {
          channelId: "test-channel-id",
          maxResults: 1,
        },
        mockYouTubeApiService,
      );

      expect(mockListChannelVideos).toHaveBeenCalledWith(
        "test-channel-id",
        1,
        "date",
      );
    });

    test("正常系: maxResultsの境界値（最大値50）でチャンネル動画一覧を取得する", async () => {
      mockListChannelVideos.mockResolvedValueOnce(mockChannelVideos);

      await handleChannelTool(
        "youtube_list_channel_videos",
        {
          channelId: "test-channel-id",
          maxResults: 50,
        },
        mockYouTubeApiService,
      );

      expect(mockListChannelVideos).toHaveBeenCalledWith(
        "test-channel-id",
        50,
        "date",
      );
    });

    test("正常系: orderのすべての有効な値でテストする", async () => {
      const orderValues = ["date", "rating", "viewCount", "title"] as const;

      for (const order of orderValues) {
        mockListChannelVideos.mockResolvedValueOnce(mockChannelVideos);

        await handleChannelTool(
          "youtube_list_channel_videos",
          {
            channelId: "test-channel-id",
            order,
          },
          mockYouTubeApiService,
        );

        expect(mockListChannelVideos).toHaveBeenCalledWith(
          "test-channel-id",
          10,
          order,
        );
      }

      expect(mockListChannelVideos).toHaveBeenCalledTimes(orderValues.length);
    });

    test("異常系: channelIdが不正な場合にZodErrorが発生する", async () => {
      await expect(
        handleChannelTool(
          "youtube_list_channel_videos",
          { channelId: 123 },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockListChannelVideos).not.toHaveBeenCalled();
    });

    test("異常系: channelIdが空文字列の場合にZodErrorが発生する", async () => {
      await expect(
        handleChannelTool(
          "youtube_list_channel_videos",
          { channelId: "" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockListChannelVideos).not.toHaveBeenCalled();
    });

    test("異常系: channelIdが未定義の場合にZodErrorが発生する", async () => {
      await expect(
        handleChannelTool(
          "youtube_list_channel_videos",
          {},
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockListChannelVideos).not.toHaveBeenCalled();
    });

    test("異常系: maxResultsが範囲外（0）の場合にZodErrorが発生する", async () => {
      await expect(
        handleChannelTool(
          "youtube_list_channel_videos",
          {
            channelId: "test-channel-id",
            maxResults: 0,
          },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockListChannelVideos).not.toHaveBeenCalled();
    });

    test("異常系: maxResultsが範囲外（51）の場合にZodErrorが発生する", async () => {
      await expect(
        handleChannelTool(
          "youtube_list_channel_videos",
          {
            channelId: "test-channel-id",
            maxResults: 51,
          },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockListChannelVideos).not.toHaveBeenCalled();
    });

    test("異常系: orderが不正な値の場合にZodErrorが発生する", async () => {
      await expect(
        handleChannelTool(
          "youtube_list_channel_videos",
          {
            channelId: "test-channel-id",
            order: "invalid-order",
          },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockListChannelVideos).not.toHaveBeenCalled();
    });

    test("異常系: YouTubeApiServiceでエラーが発生した場合", async () => {
      const apiError = new Error("Channel Videos API Error");
      mockListChannelVideos.mockRejectedValueOnce(apiError);

      await expect(
        handleChannelTool(
          "youtube_list_channel_videos",
          { channelId: "test-channel-id" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow("Channel Videos API Error");

      expect(mockListChannelVideos).toHaveBeenCalledWith(
        "test-channel-id",
        10,
        "date",
      );
    });
  });

  describe("unknown tool", () => {
    test("異常系: 未知のツール名の場合にエラーが発生する", async () => {
      await expect(
        handleChannelTool("unknown_channel_tool", {}, mockYouTubeApiService),
      ).rejects.toThrow("Unknown channel tool: unknown_channel_tool");

      expect(mockGetChannel).not.toHaveBeenCalled();
      expect(mockListChannelVideos).not.toHaveBeenCalled();
    });
  });

  describe("エラーハンドリング", () => {
    test("異常系: Channel not foundエラーの場合、日本語エラーメッセージを返す", async () => {
      const apiError = new Error("Channel not found: invalid_channel");
      mockGetChannel.mockRejectedValueOnce(apiError);

      await expect(
        handleChannelTool(
          "youtube_get_channel",
          { channelId: "invalid_channel" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow("チャンネルが見つかりません: invalid_channel");

      expect(mockGetChannel).toHaveBeenCalledWith("invalid_channel");
    });

    test("異常系: 予期しないエラーの場合、汎用エラーメッセージを返す", async () => {
      mockGetChannel.mockRejectedValueOnce("unexpected error");

      await expect(
        handleChannelTool(
          "youtube_get_channel",
          { channelId: "test_channel" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow("予期しないエラーが発生しました: unexpected error");

      expect(mockGetChannel).toHaveBeenCalledWith("test_channel");
    });
  });
});
