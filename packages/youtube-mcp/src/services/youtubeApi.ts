import type {
  ChannelDetails,
  PlaylistDetails,
  PlaylistItem,
  SearchResult,
  VideoDetails,
  YouTubeApiChannelItem,
  YouTubeApiError,
  YouTubeApiPlaylistItem,
  YouTubeApiPlaylistItemItem,
  YouTubeApiResponse,
  YouTubeApiSearchItem,
  YouTubeApiVideoItem,
} from "~/types/index.js";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

export class YouTubeApiService {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("YouTube API key is required");
    }
    this.apiKey = apiKey;
  }

  private async fetchApi<T>(
    endpoint: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${YOUTUBE_API_BASE_URL}/${endpoint}`);
    url.searchParams.append("key", this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (value != null) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = (await response.json()) as YouTubeApiError;
      throw new Error(
        `YouTube API Error: ${error.message || response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  async getVideo(
    videoId: string,
    parts: string[] = ["snippet", "statistics", "contentDetails"],
  ): Promise<VideoDetails> {
    const response = await this.fetchApi<
      YouTubeApiResponse<YouTubeApiVideoItem>
    >("videos", {
      id: videoId,
      part: parts.join(","),
    });

    // response.itemsがundefinedまたは空の場合のエラーハンドリング
    if (!response.items || response.items.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const item = response.items[0];
    if (!item) {
      throw new Error(`Video not found: ${videoId}`);
    }
    return this.mapVideoResponse(item);
  }

  async searchVideos(
    query: string,
    maxResults = 10,
    order = "relevance",
    type = "video",
  ): Promise<SearchResult[]> {
    const response = await this.fetchApi<
      YouTubeApiResponse<YouTubeApiSearchItem>
    >("search", {
      q: query,
      part: "snippet",
      maxResults: maxResults.toString(),
      order,
      type,
    });

    // response.itemsがundefinedの場合は空配列を返す
    if (!response.items) {
      return [];
    }
    return response.items.map((item) => this.mapSearchResult(item));
  }

  async getChannel(channelId: string): Promise<ChannelDetails> {
    const response = await this.fetchApi<
      YouTubeApiResponse<YouTubeApiChannelItem>
    >("channels", {
      id: channelId,
      part: "snippet,statistics",
    });

    // response.itemsがundefinedまたは空の場合のエラーハンドリング
    if (!response.items || response.items.length === 0) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const item = response.items[0];
    if (!item) {
      throw new Error(`Channel not found: ${channelId}`);
    }
    return this.mapChannelResponse(item);
  }

  async listChannelVideos(
    channelId: string,
    maxResults = 10,
    order = "date",
  ): Promise<SearchResult[]> {
    const response = await this.fetchApi<
      YouTubeApiResponse<YouTubeApiSearchItem>
    >("search", {
      channelId,
      part: "snippet",
      maxResults: maxResults.toString(),
      order,
      type: "video",
    });

    // response.itemsがundefinedの場合は空配列を返す
    if (!response.items) {
      return [];
    }
    return response.items.map((item) => this.mapSearchResult(item));
  }

  async getPlaylist(playlistId: string): Promise<PlaylistDetails> {
    const response = await this.fetchApi<
      YouTubeApiResponse<YouTubeApiPlaylistItem>
    >("playlists", {
      id: playlistId,
      part: "snippet,contentDetails",
    });

    // response.itemsがundefinedまたは空の場合のエラーハンドリング
    if (!response.items || response.items.length === 0) {
      throw new Error(`Playlist not found: ${playlistId}`);
    }

    const item = response.items[0];
    if (!item) {
      throw new Error(`Playlist not found: ${playlistId}`);
    }
    return this.mapPlaylistResponse(item);
  }

  async getPlaylistItems(
    playlistId: string,
    maxResults = 10,
  ): Promise<PlaylistItem[]> {
    const response = await this.fetchApi<
      YouTubeApiResponse<YouTubeApiPlaylistItemItem>
    >("playlistItems", {
      playlistId,
      part: "snippet,contentDetails",
      maxResults: maxResults.toString(),
    });

    // response.itemsがundefinedの場合は空配列を返す
    if (!response.items) {
      return [];
    }
    return response.items.map((item, index) =>
      this.mapPlaylistItem(item, index),
    );
  }

  private mapVideoResponse(item: YouTubeApiVideoItem): VideoDetails {
    return {
      id: item.id,
      title: item.snippet?.title ?? "",
      description: item.snippet?.description ?? "",
      channelId: item.snippet?.channelId ?? "",
      channelTitle: item.snippet?.channelTitle ?? "",
      publishedAt: item.snippet?.publishedAt ?? "",
      duration: item.contentDetails?.duration ?? "",
      viewCount: item.statistics?.viewCount ?? "0",
      likeCount: item.statistics?.likeCount ?? "0",
      commentCount: item.statistics?.commentCount ?? "0",
      thumbnails: item.snippet?.thumbnails ?? {},
      tags: item.snippet?.tags ?? [],
      categoryId: item.snippet?.categoryId,
    };
  }

  private mapChannelResponse(item: YouTubeApiChannelItem): ChannelDetails {
    return {
      id: item.id,
      title: item.snippet?.title ?? "",
      description: item.snippet?.description ?? "",
      customUrl: item.snippet?.customUrl,
      publishedAt: item.snippet?.publishedAt ?? "",
      thumbnails: item.snippet?.thumbnails ?? {},
      statistics: {
        viewCount: item.statistics?.viewCount ?? "0",
        subscriberCount: item.statistics?.subscriberCount ?? "0",
        hiddenSubscriberCount: item.statistics?.hiddenSubscriberCount ?? false,
        videoCount: item.statistics?.videoCount ?? "0",
      },
      country: item.snippet?.country,
    };
  }

  private mapPlaylistResponse(item: YouTubeApiPlaylistItem): PlaylistDetails {
    return {
      id: item.id,
      title: item.snippet?.title ?? "",
      description: item.snippet?.description ?? "",
      channelId: item.snippet?.channelId ?? "",
      channelTitle: item.snippet?.channelTitle ?? "",
      publishedAt: item.snippet?.publishedAt ?? "",
      thumbnails: item.snippet?.thumbnails ?? {},
      itemCount: item.contentDetails?.itemCount ?? 0,
      privacy: item.status?.privacyStatus ?? "public",
    };
  }

  private mapPlaylistItem(
    item: YouTubeApiPlaylistItemItem,
    index: number,
  ): PlaylistItem {
    return {
      id: item.id,
      title: item.snippet?.title ?? "",
      description: item.snippet?.description ?? "",
      videoId:
        item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId ?? "",
      position: item.snippet?.position ?? index,
      thumbnails: item.snippet?.thumbnails ?? {},
      channelId: item.snippet?.channelId ?? "",
      channelTitle: item.snippet?.channelTitle ?? "",
      publishedAt: item.snippet?.publishedAt ?? "",
    };
  }

  private mapSearchResult(item: YouTubeApiSearchItem): SearchResult {
    const idObj = typeof item.id === "string" ? null : item.id;
    const id =
      typeof item.id === "string"
        ? item.id
        : (idObj?.videoId ?? idObj?.channelId ?? idObj?.playlistId ?? "");
    const kind = idObj?.kind ?? "";
    const type = kind.includes("video")
      ? "video"
      : kind.includes("channel")
        ? "channel"
        : kind.includes("playlist")
          ? "playlist"
          : "video";

    return {
      id,
      title: item.snippet?.title ?? "",
      description: item.snippet?.description ?? "",
      channelId: item.snippet?.channelId ?? "",
      channelTitle: item.snippet?.channelTitle ?? "",
      publishedAt: item.snippet?.publishedAt ?? "",
      thumbnails: item.snippet?.thumbnails ?? {},
      type,
    };
  }
}
