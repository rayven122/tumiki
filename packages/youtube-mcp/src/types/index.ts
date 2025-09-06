import { z } from "zod";

/**
 * YouTube Data API v3 Type Definitions
 *
 * API Reference:
 * - Videos: https://developers.google.com/youtube/v3/docs/videos
 * - Channels: https://developers.google.com/youtube/v3/docs/channels
 * - Playlists: https://developers.google.com/youtube/v3/docs/playlists
 * - PlaylistItems: https://developers.google.com/youtube/v3/docs/playlistItems
 * - Search: https://developers.google.com/youtube/v3/docs/search
 *
 * Response Schema Reference:
 * - API Response Structure: https://developers.google.com/youtube/v3/docs#resource-types
 * - Error Response: https://developers.google.com/youtube/v3/docs/errors
 */

// YouTube API Response Types
export type VideoDetails = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
    standard?: { url: string; width: number; height: number };
    maxres?: { url: string; width: number; height: number };
  };
  tags?: string[];
  categoryId?: string;
};

export type ChannelDetails = {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
  country?: string;
};

export type PlaylistDetails = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
    standard?: { url: string; width: number; height: number };
    maxres?: { url: string; width: number; height: number };
  };
  itemCount: number;
  privacy: string;
};

export type PlaylistItem = {
  id: string;
  title: string;
  description: string;
  videoId: string;
  position: number;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
  };
  channelId: string;
  channelTitle: string;
  publishedAt: string;
};

export type SearchResult = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
  };
  type: "video" | "channel" | "playlist";
};

// Tool Input Schemas (Zod)
export const GetVideoSchema = z.object({
  videoId: z.string().min(1).describe("YouTube動画のID"),
  parts: z
    .array(z.enum(["snippet", "statistics", "contentDetails"]))
    .optional()
    .describe("取得する情報の種類"),
});

export const SearchVideosSchema = z.object({
  query: z.string().min(1).describe("検索クエリ"),
  maxResults: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe("最大取得件数"),
  order: z
    .enum(["relevance", "date", "rating", "viewCount", "title"])
    .optional()
    .default("relevance")
    .describe("並び順"),
  type: z
    .enum(["video", "channel", "playlist"])
    .optional()
    .default("video")
    .describe("検索対象のタイプ"),
});

export const GetChannelSchema = z.object({
  channelId: z.string().min(1).describe("YouTubeチャンネルのID"),
});

export const ListChannelVideosSchema = z.object({
  channelId: z.string().min(1).describe("YouTubeチャンネルのID"),
  maxResults: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe("最大取得件数"),
  order: z
    .enum(["date", "rating", "viewCount", "title"])
    .optional()
    .default("date")
    .describe("並び順"),
});

export const GetPlaylistSchema = z.object({
  playlistId: z.string().min(1).describe("YouTubeプレイリストのID"),
});

export const GetPlaylistItemsSchema = z.object({
  playlistId: z.string().min(1).describe("YouTubeプレイリストのID"),
  maxResults: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe("最大取得件数"),
});

// Tool Input Types
export type GetVideoInput = z.infer<typeof GetVideoSchema>;
export type SearchVideosInput = z.infer<typeof SearchVideosSchema>;
export type GetChannelInput = z.infer<typeof GetChannelSchema>;
export type ListChannelVideosInput = z.infer<typeof ListChannelVideosSchema>;
export type GetPlaylistInput = z.infer<typeof GetPlaylistSchema>;
export type GetPlaylistItemsInput = z.infer<typeof GetPlaylistItemsSchema>;

// YouTube API Error Types
export type YouTubeApiError = {
  code: number;
  message: string;
  errors?: {
    domain: string;
    reason: string;
    message: string;
  }[];
};

// YouTube API Response Types
export type YouTubeApiResponse<T = unknown> = {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo?: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: T[]; // itemsはundefinedの可能性があるため、オプショナルに変更
};

export type YouTubeApiVideoItem = {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    publishedAt?: string;
    channelId?: string;
    title?: string;
    description?: string;
    thumbnails?: Record<string, { url: string; width: number; height: number }>;
    channelTitle?: string;
    tags?: string[];
    categoryId?: string;
  };
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

export type YouTubeApiSearchItem = {
  kind: string;
  etag: string;
  id:
    | string
    | {
        kind: string;
        videoId?: string;
        channelId?: string;
        playlistId?: string;
      };
  snippet?: {
    publishedAt?: string;
    channelId?: string;
    title?: string;
    description?: string;
    thumbnails?: Record<string, { url: string; width: number; height: number }>;
    channelTitle?: string;
  };
};

export type YouTubeApiChannelItem = {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url: string; width: number; height: number }>;
    country?: string;
  };
  statistics?: {
    viewCount?: string;
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
    videoCount?: string;
  };
};

export type YouTubeApiPlaylistItem = {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    publishedAt?: string;
    channelId?: string;
    title?: string;
    description?: string;
    thumbnails?: Record<string, { url: string; width: number; height: number }>;
    channelTitle?: string;
  };
  contentDetails?: {
    itemCount?: number;
  };
  status?: {
    privacyStatus?: string;
  };
};

export type YouTubeApiPlaylistItemItem = {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    publishedAt?: string;
    channelId?: string;
    title?: string;
    description?: string;
    channelTitle?: string;
    position?: number;
    resourceId?: {
      kind: string;
      videoId?: string;
    };
    thumbnails?: Record<string, { url: string; width: number; height: number }>;
  };
  contentDetails?: {
    videoId?: string;
  };
};
