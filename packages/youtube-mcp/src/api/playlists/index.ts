import type { YoutubeApiKey } from "@/api/apiKey.js";
import type {
  PlaylistDetails,
  PlaylistItem,
  YouTubeApiPlaylistItem,
  YouTubeApiPlaylistItemResource,
} from "@/api/types.js";
import type { Result } from "@/lib/result.js";
import { fetchApi } from "@/api/fetcher.js";
import { mapPlaylistItem, mapPlaylistResponse } from "@/api/mappers.js";
import { YouTubeApiError } from "@/lib/errors/index.js";
import { err, isOk, mapResult } from "@/lib/result.js";

export const getPlaylist = async (
  playlistId: string,
  apiKey: YoutubeApiKey,
): Promise<Result<PlaylistDetails>> => {
  const result = await fetchApi<{
    items?: YouTubeApiPlaylistItem[];
  }>(
    "playlists",
    {
      id: playlistId,
      part: "snippet,contentDetails",
    },
    apiKey,
  );

  if (!isOk(result)) {
    return result;
  }

  const { items } = result.data;
  if (!items || items.length === 0) {
    return err(new YouTubeApiError(`Playlist not found: ${playlistId}`));
  }
  const firstItem = items[0];
  if (!firstItem) {
    return err(new YouTubeApiError(`Playlist not found: ${playlistId}`));
  }

  return mapResult(result, () => mapPlaylistResponse(firstItem));
};

export const getPlaylistItems = async (
  playlistId: string,
  apiKey: YoutubeApiKey,
  maxResults = 10,
): Promise<Result<PlaylistItem[]>> => {
  const result = await fetchApi<{
    items?: YouTubeApiPlaylistItemResource[];
  }>(
    "playlistItems",
    {
      playlistId,
      part: "snippet,contentDetails",
      maxResults,
    },
    apiKey,
  );

  return mapResult(result, (data) => {
    if (!data.items) {
      return [];
    }
    return data.items.map(mapPlaylistItem);
  });
};
