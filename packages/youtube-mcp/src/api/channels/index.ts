import type { YoutubeApiKey } from "@/api/apiKey.js";
import type {
  ChannelDetails,
  SearchResult,
  YouTubeApiChannelItem,
  YouTubeApiSearchItem,
} from "@/api/types.js";
import type { Result } from "@/lib/result.js";
import { YouTubeApiError } from "@/api/errors/index.js";
import { fetchApi } from "@/api/fetcher.js";
import { mapChannelResponse, mapSearchResult } from "@/api/mappers.js";
import { err, isOk, mapResult } from "@/lib/result.js";

export const getChannel = async (
  channelId: string,
  apiKey: YoutubeApiKey,
): Promise<Result<ChannelDetails>> => {
  const result = await fetchApi<{
    items?: YouTubeApiChannelItem[];
  }>(
    "channels",
    {
      id: channelId,
      part: "snippet,statistics",
    },
    apiKey,
  );

  if (!isOk(result)) {
    return result;
  }

  const { items } = result.value;
  if (!items || items.length === 0) {
    return err(new YouTubeApiError(`Channel not found: ${channelId}`));
  }
  const firstItem = items[0];
  if (!firstItem) {
    return err(new YouTubeApiError(`Channel not found: ${channelId}`));
  }

  return mapResult(result, () => mapChannelResponse(firstItem));
};

export const getChannelVideos = async (
  channelId: string,
  apiKey: YoutubeApiKey,
  maxResults = 10,
  order: "date" | "rating" | "viewCount" | "title" = "date",
): Promise<Result<SearchResult[]>> => {
  const result = await fetchApi<{
    items?: YouTubeApiSearchItem[];
  }>(
    "search",
    {
      channelId,
      part: "snippet",
      maxResults,
      order,
      type: "video",
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
