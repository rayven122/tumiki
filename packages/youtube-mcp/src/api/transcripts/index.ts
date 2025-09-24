import type { YoutubeApiKey } from "@/api/apiKey.js";
import type { TranscriptMetadata, YouTubeApiCaptionItem } from "@/api/types.js";
import type { Result } from "@/lib/result.js";
import { fetchApi } from "@/api/fetcher.js";
import { mapCaptionResponse } from "@/api/mappers.js";
import { mapResult } from "@/lib/result.js";

export const getTranscriptMetadata = async (
  videoId: string,
  apiKey: YoutubeApiKey,
): Promise<Result<TranscriptMetadata[]>> => {
  const result = await fetchApi<{
    items?: YouTubeApiCaptionItem[];
  }>(
    "captions",
    {
      part: "snippet",
      videoId,
    },
    apiKey,
  );

  return mapResult(result, (data) => {
    if (!data.items) {
      return [];
    }
    return data.items.map(mapCaptionResponse);
  });
};
