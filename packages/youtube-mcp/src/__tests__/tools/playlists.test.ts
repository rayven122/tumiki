import { beforeEach, describe, expect, test, vi } from "vitest";
import { ZodError } from "zod";

import type { YouTubeApiService } from "~/services/youtubeApi.js";
import type { PlaylistDetails, PlaylistItem } from "~/types/index.js";
import { handlePlaylistTool } from "~/tools/playlists.js";

// YouTubeApiServiceをモック化
const mockGetPlaylist = vi.fn();
const mockGetPlaylistItems = vi.fn();

const createMockYouTubeApiService = (): YouTubeApiService =>
  ({
    getVideo: vi.fn(),
    searchVideos: vi.fn(),
    getChannel: vi.fn(),
    listChannelVideos: vi.fn(),
    getPlaylist: mockGetPlaylist,
    getPlaylistItems: mockGetPlaylistItems,
  }) as any;

describe("handlePlaylistTool", () => {
  let mockYouTubeApiService: YouTubeApiService;

  beforeEach(() => {
    mockYouTubeApiService = createMockYouTubeApiService();
    mockGetPlaylist.mockClear();
    mockGetPlaylistItems.mockClear();
  });

  describe("youtube_get_playlist", () => {
    const mockPlaylistDetails: PlaylistDetails = {
      id: "test-playlist-id",
      title: "テストプレイリスト",
      description: "テストプレイリストの説明です。長い説明文が含まれています。",
      channelId: "test-channel-id",
      channelTitle: "テストチャンネル",
      publishedAt: "2023-01-01T00:00:00Z",
      thumbnails: {
        default: {
          url: "https://example.com/playlist-thumb.jpg",
          width: 120,
          height: 90,
        },
        medium: {
          url: "https://example.com/playlist-thumb-medium.jpg",
          width: 320,
          height: 180,
        },
        high: {
          url: "https://example.com/playlist-thumb-high.jpg",
          width: 480,
          height: 360,
        },
        standard: {
          url: "https://example.com/playlist-thumb-standard.jpg",
          width: 640,
          height: 480,
        },
        maxres: {
          url: "https://example.com/playlist-thumb-maxres.jpg",
          width: 1280,
          height: 720,
        },
      },
      itemCount: 15,
      privacy: "public",
    };

    test("正常系: プレイリスト情報を取得する", async () => {
      mockGetPlaylist.mockResolvedValueOnce(mockPlaylistDetails);

      const result = await handlePlaylistTool(
        "youtube_get_playlist",
        { playlistId: "test-playlist-id" },
        mockYouTubeApiService,
      );

      expect(mockGetPlaylist).toHaveBeenCalledWith("test-playlist-id");
      expect(result).toStrictEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockPlaylistDetails, null, 2),
          },
        ],
      });
    });

    test("異常系: playlistIdが不正な場合にZodErrorが発生する", async () => {
      await expect(
        handlePlaylistTool(
          "youtube_get_playlist",
          { playlistId: 123 },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetPlaylist).not.toHaveBeenCalled();
    });

    test("異常系: playlistIdが空文字列の場合にZodErrorが発生する", async () => {
      await expect(
        handlePlaylistTool(
          "youtube_get_playlist",
          { playlistId: "" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetPlaylist).not.toHaveBeenCalled();
    });

    test("異常系: playlistIdが未定義の場合にZodErrorが発生する", async () => {
      await expect(
        handlePlaylistTool("youtube_get_playlist", {}, mockYouTubeApiService),
      ).rejects.toThrow(ZodError);

      expect(mockGetPlaylist).not.toHaveBeenCalled();
    });

    test("異常系: YouTubeApiServiceでエラーが発生した場合", async () => {
      const apiError = new Error("Playlist API Error");
      mockGetPlaylist.mockRejectedValueOnce(apiError);

      await expect(
        handlePlaylistTool(
          "youtube_get_playlist",
          { playlistId: "test-playlist-id" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow("Playlist API Error");

      expect(mockGetPlaylist).toHaveBeenCalledWith("test-playlist-id");
    });
  });

  describe("youtube_get_playlist_items", () => {
    const mockPlaylistItems: PlaylistItem[] = [
      {
        id: "playlist-item-id-1",
        title: "プレイリスト動画1",
        description:
          "プレイリスト動画の説明1です。詳細な内容が記載されています。",
        videoId: "playlist-video-id-1",
        position: 0,
        thumbnails: {
          default: {
            url: "https://example.com/playlist-item-thumb1.jpg",
            width: 120,
            height: 90,
          },
          medium: {
            url: "https://example.com/playlist-item-thumb1-medium.jpg",
            width: 320,
            height: 180,
          },
          high: {
            url: "https://example.com/playlist-item-thumb1-high.jpg",
            width: 480,
            height: 360,
          },
        },
        channelId: "test-channel-id",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-01-01T00:00:00Z",
      },
      {
        id: "playlist-item-id-2",
        title: "プレイリスト動画2",
        description: "プレイリスト動画の説明2です。",
        videoId: "playlist-video-id-2",
        position: 1,
        thumbnails: {
          default: {
            url: "https://example.com/playlist-item-thumb2.jpg",
            width: 120,
            height: 90,
          },
        },
        channelId: "test-channel-id",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-01-02T00:00:00Z",
      },
      {
        id: "playlist-item-id-3",
        title: "プレイリスト動画3",
        description: "",
        videoId: "playlist-video-id-3",
        position: 2,
        thumbnails: {},
        channelId: "test-channel-id",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-01-03T00:00:00Z",
      },
    ];

    test("正常系: デフォルトパラメータでプレイリストアイテム一覧を取得する", async () => {
      mockGetPlaylistItems.mockResolvedValueOnce(mockPlaylistItems);

      const result = await handlePlaylistTool(
        "youtube_get_playlist_items",
        { playlistId: "test-playlist-id" },
        mockYouTubeApiService,
      );

      expect(mockGetPlaylistItems).toHaveBeenCalledWith("test-playlist-id", 10);
      expect(result).toStrictEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockPlaylistItems, null, 2),
          },
        ],
      });
    });

    test("正常系: カスタムmaxResultsでプレイリストアイテム一覧を取得する", async () => {
      mockGetPlaylistItems.mockResolvedValueOnce(mockPlaylistItems);

      const result = await handlePlaylistTool(
        "youtube_get_playlist_items",
        {
          playlistId: "test-playlist-id",
          maxResults: 25,
        },
        mockYouTubeApiService,
      );

      expect(mockGetPlaylistItems).toHaveBeenCalledWith("test-playlist-id", 25);
      expect(result).toStrictEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify(mockPlaylistItems, null, 2),
          },
        ],
      });
    });

    test("正常系: maxResultsの境界値（最小値1）でプレイリストアイテム一覧を取得する", async () => {
      mockGetPlaylistItems.mockResolvedValueOnce([mockPlaylistItems[0]!]);

      await handlePlaylistTool(
        "youtube_get_playlist_items",
        {
          playlistId: "test-playlist-id",
          maxResults: 1,
        },
        mockYouTubeApiService,
      );

      expect(mockGetPlaylistItems).toHaveBeenCalledWith("test-playlist-id", 1);
    });

    test("正常系: maxResultsの境界値（最大値50）でプレイリストアイテム一覧を取得する", async () => {
      mockGetPlaylistItems.mockResolvedValueOnce(mockPlaylistItems);

      await handlePlaylistTool(
        "youtube_get_playlist_items",
        {
          playlistId: "test-playlist-id",
          maxResults: 50,
        },
        mockYouTubeApiService,
      );

      expect(mockGetPlaylistItems).toHaveBeenCalledWith("test-playlist-id", 50);
    });

    test("異常系: playlistIdが不正な場合にZodErrorが発生する", async () => {
      await expect(
        handlePlaylistTool(
          "youtube_get_playlist_items",
          { playlistId: 123 },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetPlaylistItems).not.toHaveBeenCalled();
    });

    test("異常系: playlistIdが空文字列の場合にZodErrorが発生する", async () => {
      await expect(
        handlePlaylistTool(
          "youtube_get_playlist_items",
          { playlistId: "" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetPlaylistItems).not.toHaveBeenCalled();
    });

    test("異常系: playlistIdが未定義の場合にZodErrorが発生する", async () => {
      await expect(
        handlePlaylistTool(
          "youtube_get_playlist_items",
          {},
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetPlaylistItems).not.toHaveBeenCalled();
    });

    test("異常系: maxResultsが範囲外（0）の場合にZodErrorが発生する", async () => {
      await expect(
        handlePlaylistTool(
          "youtube_get_playlist_items",
          {
            playlistId: "test-playlist-id",
            maxResults: 0,
          },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetPlaylistItems).not.toHaveBeenCalled();
    });

    test("異常系: maxResultsが範囲外（51）の場合にZodErrorが発生する", async () => {
      await expect(
        handlePlaylistTool(
          "youtube_get_playlist_items",
          {
            playlistId: "test-playlist-id",
            maxResults: 51,
          },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetPlaylistItems).not.toHaveBeenCalled();
    });

    test("異常系: maxResultsが文字列の場合にZodErrorが発生する", async () => {
      await expect(
        handlePlaylistTool(
          "youtube_get_playlist_items",
          {
            playlistId: "test-playlist-id",
            maxResults: "invalid",
          },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow(ZodError);

      expect(mockGetPlaylistItems).not.toHaveBeenCalled();
    });

    test("異常系: YouTubeApiServiceでエラーが発生した場合", async () => {
      const apiError = new Error("Playlist Items API Error");
      mockGetPlaylistItems.mockRejectedValueOnce(apiError);

      await expect(
        handlePlaylistTool(
          "youtube_get_playlist_items",
          { playlistId: "test-playlist-id" },
          mockYouTubeApiService,
        ),
      ).rejects.toThrow("Playlist Items API Error");

      expect(mockGetPlaylistItems).toHaveBeenCalledWith("test-playlist-id", 10);
    });
  });

  describe("unknown tool", () => {
    test("異常系: 未知のツール名の場合にエラーが発生する", async () => {
      await expect(
        handlePlaylistTool("unknown_playlist_tool", {}, mockYouTubeApiService),
      ).rejects.toThrow("Unknown playlist tool: unknown_playlist_tool");

      expect(mockGetPlaylist).not.toHaveBeenCalled();
      expect(mockGetPlaylistItems).not.toHaveBeenCalled();
    });
  });
});
