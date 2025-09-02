import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type {
  YouTubeApiChannelItem,
  YouTubeApiError,
  YouTubeApiPlaylistItem,
  YouTubeApiPlaylistItemItem,
  YouTubeApiResponse,
  YouTubeApiSearchItem,
  YouTubeApiVideoItem,
} from "../../types/index.js";
import { YouTubeApiService } from "../../services/youtubeApi.js";

// globalThis.fetchをモック化
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("YouTubeApiService", () => {
  let youtubeService: YouTubeApiService;

  beforeEach(() => {
    youtubeService = new YouTubeApiService("test-api-key");
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    test("正常系: APIキーが設定される", () => {
      const service = new YouTubeApiService("test-key");
      expect(service).toBeInstanceOf(YouTubeApiService);
    });

    test("異常系: APIキーが空文字列の場合にエラーが発生する", () => {
      expect(() => new YouTubeApiService("")).toThrow(
        "YouTube API key is required",
      );
    });

    test("異常系: APIキーがundefinedの場合にエラーが発生する", () => {
      expect(() => new YouTubeApiService(undefined as any)).toThrow(
        "YouTube API key is required",
      );
    });

    test("異常系: APIキーがnullの場合にエラーが発生する", () => {
      expect(() => new YouTubeApiService(null as any)).toThrow(
        "YouTube API key is required",
      );
    });
  });

  describe("getVideo", () => {
    const mockVideoResponse: YouTubeApiResponse<YouTubeApiVideoItem> = {
      kind: "youtube#videoListResponse",
      etag: "test-etag",
      items: [
        {
          kind: "youtube#video",
          etag: "test-etag",
          id: "test-video-id",
          snippet: {
            publishedAt: "2023-01-01T00:00:00Z",
            channelId: "test-channel-id",
            title: "テスト動画",
            description: "テスト動画の説明",
            thumbnails: {
              default: {
                url: "https://example.com/thumb.jpg",
                width: 120,
                height: 90,
              },
            },
            channelTitle: "テストチャンネル",
            tags: ["test", "video"],
            categoryId: "22",
          },
          contentDetails: {
            duration: "PT10M30S",
          },
          statistics: {
            viewCount: "1000",
            likeCount: "100",
            commentCount: "10",
          },
        },
      ],
    };

    test("正常系: 動画情報を取得する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => mockVideoResponse,
      });

      const result = await youtubeService.getVideo("test-video-id");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/youtube/v3/videos?key=test-api-key&id=test-video-id&part=snippet%2Cstatistics%2CcontentDetails",
      );
      expect(result).toStrictEqual({
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
      });
    });

    test("正常系: カスタムpartsパラメータで動画情報を取得する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => mockVideoResponse,
      });

      await youtubeService.getVideo("test-video-id", ["snippet"]);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/youtube/v3/videos?key=test-api-key&id=test-video-id&part=snippet",
      );
    });

    test("正常系: データが部分的に欠けている場合にデフォルト値が使用される", async () => {
      const incompleteResponse: YouTubeApiResponse<YouTubeApiVideoItem> = {
        kind: "youtube#videoListResponse",
        etag: "test-etag",
        items: [
          {
            kind: "youtube#video",
            etag: "test-etag",
            id: "test-video-id",
            snippet: {},
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => incompleteResponse,
      });

      const result = await youtubeService.getVideo("test-video-id");

      expect(result).toStrictEqual({
        id: "test-video-id",
        title: "",
        description: "",
        channelId: "",
        channelTitle: "",
        publishedAt: "",
        duration: "",
        viewCount: "0",
        likeCount: "0",
        commentCount: "0",
        thumbnails: {},
        tags: [],
        categoryId: undefined,
      });
    });

    test("異常系: 動画が見つからない場合にエラーが発生する", async () => {
      const emptyResponse: YouTubeApiResponse<YouTubeApiVideoItem> = {
        kind: "youtube#videoListResponse",
        etag: "test-etag",
        items: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => emptyResponse,
      });

      await expect(youtubeService.getVideo("not-found")).rejects.toThrow(
        "Video not found: not-found",
      );
    });

    test("異常系: APIエラーが発生した場合にエラーをスローする", async () => {
      const errorResponse: YouTubeApiError = {
        code: 400,
        message: "Bad Request",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
        json: () => errorResponse,
      });

      await expect(youtubeService.getVideo("test-video-id")).rejects.toThrow(
        "YouTube API Error: Bad Request",
      );
    });

    test("異常系: APIエラーでメッセージがない場合はstatusTextを使用する", async () => {
      const errorResponse: YouTubeApiError = {
        code: 400,
        message: "",
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request Status",
        json: () => errorResponse,
      });

      await expect(youtubeService.getVideo("test-video-id")).rejects.toThrow(
        "YouTube API Error: Bad Request Status",
      );
    });

    test("異常系: レスポンスのitemsが空でない場合でも最初の要素がundefinedの場合にエラーが発生する", async () => {
      const invalidResponse: YouTubeApiResponse<YouTubeApiVideoItem> = {
        kind: "youtube#videoListResponse",
        etag: "test-etag",
        items: [undefined as any],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => invalidResponse,
      });

      await expect(youtubeService.getVideo("test-video-id")).rejects.toThrow(
        "Video not found: test-video-id",
      );
    });
  });

  describe("searchVideos", () => {
    const mockSearchResponse: YouTubeApiResponse<YouTubeApiSearchItem> = {
      kind: "youtube#searchListResponse",
      etag: "test-etag",
      items: [
        {
          kind: "youtube#searchResult",
          etag: "test-etag",
          id: {
            kind: "youtube#video",
            videoId: "search-video-id",
          },
          snippet: {
            publishedAt: "2023-01-01T00:00:00Z",
            channelId: "search-channel-id",
            title: "検索結果動画",
            description: "検索結果の説明",
            thumbnails: {
              default: {
                url: "https://example.com/search-thumb.jpg",
                width: 120,
                height: 90,
              },
            },
            channelTitle: "検索チャンネル",
          },
        },
      ],
    };

    test("正常系: デフォルトパラメータで動画を検索する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => mockSearchResponse,
      });

      const result = await youtubeService.searchVideos("test query");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/youtube/v3/search?key=test-api-key&q=test+query&part=snippet&maxResults=10&order=relevance&type=video",
      );
      expect(result).toStrictEqual([
        {
          id: "search-video-id",
          title: "検索結果動画",
          description: "検索結果の説明",
          channelId: "search-channel-id",
          channelTitle: "検索チャンネル",
          publishedAt: "2023-01-01T00:00:00Z",
          thumbnails: {
            default: {
              url: "https://example.com/search-thumb.jpg",
              width: 120,
              height: 90,
            },
          },
          type: "video",
        },
      ]);
    });

    test("正常系: カスタムパラメータで動画を検索する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => mockSearchResponse,
      });

      await youtubeService.searchVideos("test", 20, "date", "channel");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/youtube/v3/search?key=test-api-key&q=test&part=snippet&maxResults=20&order=date&type=channel",
      );
    });

    test("正常系: idが文字列の場合の検索結果をマップする", async () => {
      const stringIdResponse: YouTubeApiResponse<YouTubeApiSearchItem> = {
        kind: "youtube#searchListResponse",
        etag: "test-etag",
        items: [
          {
            kind: "youtube#searchResult",
            etag: "test-etag",
            id: "string-id",
            snippet: {
              title: "文字列ID動画",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => stringIdResponse,
      });

      const result = await youtubeService.searchVideos("test");

      expect(result[0]?.id).toBe("string-id");
      expect(result[0]?.type).toBe("video");
    });

    test("正常系: チャンネルタイプの検索結果をマップする", async () => {
      const channelResponse: YouTubeApiResponse<YouTubeApiSearchItem> = {
        kind: "youtube#searchListResponse",
        etag: "test-etag",
        items: [
          {
            kind: "youtube#searchResult",
            etag: "test-etag",
            id: {
              kind: "youtube#channel",
              channelId: "channel-id",
            },
            snippet: {
              title: "チャンネル結果",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => channelResponse,
      });

      const result = await youtubeService.searchVideos("test");

      expect(result[0]?.id).toBe("channel-id");
      expect(result[0]?.type).toBe("channel");
    });

    test("正常系: プレイリストタイプの検索結果をマップする", async () => {
      const playlistResponse: YouTubeApiResponse<YouTubeApiSearchItem> = {
        kind: "youtube#searchListResponse",
        etag: "test-etag",
        items: [
          {
            kind: "youtube#searchResult",
            etag: "test-etag",
            id: {
              kind: "youtube#playlist",
              playlistId: "playlist-id",
            },
            snippet: {
              title: "プレイリスト結果",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => playlistResponse,
      });

      const result = await youtubeService.searchVideos("test");

      expect(result[0]?.id).toBe("playlist-id");
      expect(result[0]?.type).toBe("playlist");
    });

    test("正常系: レスポンスのitemsがundefinedの場合は空配列を返す", async () => {
      const invalidResponse = {
        kind: "youtube#searchListResponse",
        etag: "test-etag",
        // itemsプロパティが存在しない
      } as any;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => invalidResponse,
      });

      const result = await youtubeService.searchVideos("test");
      expect(result).toStrictEqual([]);
    });

    test("正常系: 不明なkindの場合はvideoタイプにフォールバックする", async () => {
      const unknownKindResponse: YouTubeApiResponse<YouTubeApiSearchItem> = {
        kind: "youtube#searchListResponse",
        etag: "test-etag",
        items: [
          {
            kind: "youtube#searchResult",
            etag: "test-etag",
            id: {
              kind: "youtube#unknown",
            },
            snippet: {
              title: "不明タイプ",
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => unknownKindResponse,
      });

      const result = await youtubeService.searchVideos("test");

      expect(result[0]?.type).toBe("video");
    });

    test("正常系: 検索結果のデータが部分的に欠けている場合にデフォルト値が使用される", async () => {
      const incompleteSearchResponse: YouTubeApiResponse<YouTubeApiSearchItem> =
        {
          kind: "youtube#searchListResponse",
          etag: "test-etag",
          items: [
            {
              kind: "youtube#searchResult",
              etag: "test-etag",
              id: {
                kind: "youtube#video",
                videoId: "incomplete-video-id",
              },
              snippet: {},
            },
          ],
        };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => incompleteSearchResponse,
      });

      const result = await youtubeService.searchVideos("test");

      expect(result[0]).toStrictEqual({
        id: "incomplete-video-id",
        title: "",
        description: "",
        channelId: "",
        channelTitle: "",
        publishedAt: "",
        thumbnails: {},
        type: "video",
      });
    });
  });

  describe("getChannel", () => {
    const mockChannelResponse: YouTubeApiResponse<YouTubeApiChannelItem> = {
      kind: "youtube#channelListResponse",
      etag: "test-etag",
      items: [
        {
          kind: "youtube#channel",
          etag: "test-etag",
          id: "test-channel-id",
          snippet: {
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
            },
            country: "JP",
          },
          statistics: {
            viewCount: "10000",
            subscriberCount: "1000",
            hiddenSubscriberCount: false,
            videoCount: "100",
          },
        },
      ],
    };

    test("正常系: チャンネル情報を取得する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => mockChannelResponse,
      });

      const result = await youtubeService.getChannel("test-channel-id");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/youtube/v3/channels?key=test-api-key&id=test-channel-id&part=snippet%2Cstatistics",
      );
      expect(result).toStrictEqual({
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
        },
        statistics: {
          viewCount: "10000",
          subscriberCount: "1000",
          hiddenSubscriberCount: false,
          videoCount: "100",
        },
        country: "JP",
      });
    });

    test("正常系: チャンネル情報が部分的に欠けている場合にデフォルト値が使用される", async () => {
      const incompleteChannelResponse: YouTubeApiResponse<YouTubeApiChannelItem> =
        {
          kind: "youtube#channelListResponse",
          etag: "test-etag",
          items: [
            {
              kind: "youtube#channel",
              etag: "test-etag",
              id: "test-channel-id",
              snippet: {},
              statistics: {},
            },
          ],
        };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => incompleteChannelResponse,
      });

      const result = await youtubeService.getChannel("test-channel-id");

      expect(result).toStrictEqual({
        id: "test-channel-id",
        title: "",
        description: "",
        customUrl: undefined,
        publishedAt: "",
        thumbnails: {},
        statistics: {
          viewCount: "0",
          subscriberCount: "0",
          hiddenSubscriberCount: false,
          videoCount: "0",
        },
        country: undefined,
      });
    });

    test("異常系: チャンネルが見つからない場合にエラーが発生する", async () => {
      const emptyResponse: YouTubeApiResponse<YouTubeApiChannelItem> = {
        kind: "youtube#channelListResponse",
        etag: "test-etag",
        items: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => emptyResponse,
      });

      await expect(youtubeService.getChannel("not-found")).rejects.toThrow(
        "Channel not found: not-found",
      );
    });

    test("異常系: レスポンスのitemsが空でない場合でも最初の要素がundefinedの場合にエラーが発生する", async () => {
      const invalidResponse: YouTubeApiResponse<YouTubeApiChannelItem> = {
        kind: "youtube#channelListResponse",
        etag: "test-etag",
        items: [undefined as any],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => invalidResponse,
      });

      await expect(
        youtubeService.getChannel("test-channel-id"),
      ).rejects.toThrow("Channel not found: test-channel-id");
    });

    test("異常系: レスポンスのitemsがundefinedの場合にエラーが発生する", async () => {
      const invalidResponse = {
        kind: "youtube#channelListResponse",
        etag: "test-etag",
        // itemsプロパティが存在しない
      } as any;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => invalidResponse,
      });

      await expect(
        youtubeService.getChannel("test-channel-id"),
      ).rejects.toThrow("Channel not found: test-channel-id");
    });
  });

  describe("listChannelVideos", () => {
    const mockChannelVideosResponse: YouTubeApiResponse<YouTubeApiSearchItem> =
      {
        kind: "youtube#searchListResponse",
        etag: "test-etag",
        items: [
          {
            kind: "youtube#searchResult",
            etag: "test-etag",
            id: {
              kind: "youtube#video",
              videoId: "channel-video-id",
            },
            snippet: {
              publishedAt: "2023-01-01T00:00:00Z",
              channelId: "test-channel-id",
              title: "チャンネル動画",
              description: "チャンネル動画の説明",
              thumbnails: {},
              channelTitle: "テストチャンネル",
            },
          },
        ],
      };

    test("正常系: デフォルトパラメータでチャンネル動画を取得する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => mockChannelVideosResponse,
      });

      const result = await youtubeService.listChannelVideos("test-channel-id");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/youtube/v3/search?key=test-api-key&channelId=test-channel-id&part=snippet&maxResults=10&order=date&type=video",
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("チャンネル動画");
    });

    test("正常系: カスタムパラメータでチャンネル動画を取得する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => mockChannelVideosResponse,
      });

      await youtubeService.listChannelVideos(
        "test-channel-id",
        20,
        "viewCount",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/youtube/v3/search?key=test-api-key&channelId=test-channel-id&part=snippet&maxResults=20&order=viewCount&type=video",
      );
    });
  });

  describe("getPlaylist", () => {
    const mockPlaylistResponse: YouTubeApiResponse<YouTubeApiPlaylistItem> = {
      kind: "youtube#playlistListResponse",
      etag: "test-etag",
      items: [
        {
          kind: "youtube#playlist",
          etag: "test-etag",
          id: "test-playlist-id",
          snippet: {
            publishedAt: "2023-01-01T00:00:00Z",
            channelId: "test-channel-id",
            title: "テストプレイリスト",
            description: "テストプレイリストの説明",
            thumbnails: {
              default: {
                url: "https://example.com/playlist-thumb.jpg",
                width: 120,
                height: 90,
              },
            },
            channelTitle: "テストチャンネル",
          },
          contentDetails: {
            itemCount: 5,
          },
          status: {
            privacyStatus: "public",
          },
        },
      ],
    };

    test("正常系: プレイリスト情報を取得する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => mockPlaylistResponse,
      });

      const result = await youtubeService.getPlaylist("test-playlist-id");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/youtube/v3/playlists?key=test-api-key&id=test-playlist-id&part=snippet%2CcontentDetails",
      );
      expect(result).toStrictEqual({
        id: "test-playlist-id",
        title: "テストプレイリスト",
        description: "テストプレイリストの説明",
        channelId: "test-channel-id",
        channelTitle: "テストチャンネル",
        publishedAt: "2023-01-01T00:00:00Z",
        thumbnails: {
          default: {
            url: "https://example.com/playlist-thumb.jpg",
            width: 120,
            height: 90,
          },
        },
        itemCount: 5,
        privacy: "public",
      });
    });

    test("正常系: プレイリスト情報が部分的に欠けている場合にデフォルト値が使用される", async () => {
      const incompletePlaylistResponse: YouTubeApiResponse<YouTubeApiPlaylistItem> =
        {
          kind: "youtube#playlistListResponse",
          etag: "test-etag",
          items: [
            {
              kind: "youtube#playlist",
              etag: "test-etag",
              id: "test-playlist-id",
              snippet: {},
              contentDetails: {},
              status: {},
            },
          ],
        };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => incompletePlaylistResponse,
      });

      const result = await youtubeService.getPlaylist("test-playlist-id");

      expect(result).toStrictEqual({
        id: "test-playlist-id",
        title: "",
        description: "",
        channelId: "",
        channelTitle: "",
        publishedAt: "",
        thumbnails: {},
        itemCount: 0,
        privacy: "public",
      });
    });

    test("異常系: プレイリストが見つからない場合にエラーが発生する", async () => {
      const emptyResponse: YouTubeApiResponse<YouTubeApiPlaylistItem> = {
        kind: "youtube#playlistListResponse",
        etag: "test-etag",
        items: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => emptyResponse,
      });

      await expect(youtubeService.getPlaylist("not-found")).rejects.toThrow(
        "Playlist not found: not-found",
      );
    });

    test("異常系: レスポンスのitemsが空でない場合でも最初の要素がundefinedの場合にエラーが発生する", async () => {
      const invalidResponse: YouTubeApiResponse<YouTubeApiPlaylistItem> = {
        kind: "youtube#playlistListResponse",
        etag: "test-etag",
        items: [undefined as any],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => invalidResponse,
      });

      await expect(
        youtubeService.getPlaylist("test-playlist-id"),
      ).rejects.toThrow("Playlist not found: test-playlist-id");
    });
  });

  describe("getPlaylistItems", () => {
    const mockPlaylistItemsResponse: YouTubeApiResponse<YouTubeApiPlaylistItemItem> =
      {
        kind: "youtube#playlistItemListResponse",
        etag: "test-etag",
        items: [
          {
            kind: "youtube#playlistItem",
            etag: "test-etag",
            id: "playlist-item-id",
            snippet: {
              publishedAt: "2023-01-01T00:00:00Z",
              channelId: "test-channel-id",
              title: "プレイリスト動画",
              description: "プレイリスト動画の説明",
              channelTitle: "テストチャンネル",
              position: 0,
              resourceId: {
                kind: "youtube#video",
                videoId: "playlist-video-id",
              },
              thumbnails: {
                default: {
                  url: "https://example.com/playlist-item-thumb.jpg",
                  width: 120,
                  height: 90,
                },
              },
            },
            contentDetails: {
              videoId: "playlist-video-id",
            },
          },
        ],
      };

    test("正常系: デフォルトパラメータでプレイリストアイテムを取得する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => mockPlaylistItemsResponse,
      });

      const result = await youtubeService.getPlaylistItems("test-playlist-id");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/youtube/v3/playlistItems?key=test-api-key&playlistId=test-playlist-id&part=snippet%2CcontentDetails&maxResults=10",
      );
      expect(result).toStrictEqual([
        {
          id: "playlist-item-id",
          title: "プレイリスト動画",
          description: "プレイリスト動画の説明",
          videoId: "playlist-video-id",
          position: 0,
          thumbnails: {
            default: {
              url: "https://example.com/playlist-item-thumb.jpg",
              width: 120,
              height: 90,
            },
          },
          channelId: "test-channel-id",
          channelTitle: "テストチャンネル",
          publishedAt: "2023-01-01T00:00:00Z",
        },
      ]);
    });

    test("正常系: カスタムmaxResultsでプレイリストアイテムを取得する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => mockPlaylistItemsResponse,
      });

      await youtubeService.getPlaylistItems("test-playlist-id", 25);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/youtube/v3/playlistItems?key=test-api-key&playlistId=test-playlist-id&part=snippet%2CcontentDetails&maxResults=25",
      );
    });

    test("正常系: contentDetailsとresourceIdの両方からvideoIdを取得する", async () => {
      const itemWithoutContentDetails: YouTubeApiResponse<YouTubeApiPlaylistItemItem> =
        {
          kind: "youtube#playlistItemListResponse",
          etag: "test-etag",
          items: [
            {
              kind: "youtube#playlistItem",
              etag: "test-etag",
              id: "playlist-item-id-2",
              snippet: {
                resourceId: {
                  kind: "youtube#video",
                  videoId: "resource-video-id",
                },
              },
            },
          ],
        };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => itemWithoutContentDetails,
      });

      const result = await youtubeService.getPlaylistItems("test-playlist-id");

      expect(result[0]?.videoId).toBe("resource-video-id");
    });

    test("正常系: positionがない場合はインデックスを使用する", async () => {
      const itemWithoutPosition: YouTubeApiResponse<YouTubeApiPlaylistItemItem> =
        {
          kind: "youtube#playlistItemListResponse",
          etag: "test-etag",
          items: [
            {
              kind: "youtube#playlistItem",
              etag: "test-etag",
              id: "playlist-item-id-3",
              snippet: {},
            },
          ],
        };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => itemWithoutPosition,
      });

      const result = await youtubeService.getPlaylistItems("test-playlist-id");

      expect(result[0]?.position).toBe(0);
    });
  });
});
