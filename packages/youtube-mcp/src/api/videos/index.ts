import type { YoutubeApiKey } from "@/api/apiKey.js";
import type {
  SearchResult,
  VideoDetails,
  YouTubeApiSearchItem,
  YouTubeApiVideoItem,
} from "@/api/types.js";
import type { Result } from "@/lib/result.js";
import { fetchApi } from "@/api/fetcher.js";
import { mapSearchResult, mapVideoResponse } from "@/api/mappers.js";
import { YouTubeApiError } from "@/lib/errors/index.js";
import { err, isOk, mapResult } from "@/lib/result.js";

export const getVideo = async (
  videoId: string,
  apiKey: YoutubeApiKey,
  parts: string[] = ["snippet", "statistics", "contentDetails"],
): Promise<Result<VideoDetails>> => {
  const result = await fetchApi<{
    items?: YouTubeApiVideoItem[];
  }>(
    "videos",
    {
      id: videoId,
      part: parts.join(","),
    },
    apiKey,
  );

  if (!isOk(result)) {
    return result;
  }

  const { items } = result.data;
  if (!items || items.length === 0) {
    return err(new YouTubeApiError(`Video not found: ${videoId}`));
  }
  const firstItem = items[0];
  if (!firstItem) {
    return err(new YouTubeApiError(`Video not found: ${videoId}`));
  }

  return mapResult(result, () => mapVideoResponse(firstItem));
};

export const searchVideos = async (
  query: string,
  apiKey: YoutubeApiKey,
  maxResults = 10,
  order: "relevance" | "date" | "rating" | "viewCount" | "title" = "relevance",
  type: "video" | "channel" | "playlist" = "video",
): Promise<Result<SearchResult[]>> => {
  const result = await fetchApi<{
    items?: YouTubeApiSearchItem[];
  }>(
    "search",
    {
      q: query,
      part: "snippet",
      maxResults,
      order,
      type,
    },
    apiKey,
  );

  return mapResult(result, (data) => {
    if (!data.items) {
      return [];
    }
    return data.items.map(mapSearchResult);
  });
};
