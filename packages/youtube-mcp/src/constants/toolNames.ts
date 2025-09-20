/**
 * YouTube MCP ツール名定義
 * 全てのツール名は <category>_<action> の形式に従う
 */

// ツール名の型定義
type ToolName = `${string}_${string}`;

// ツール名定義（as const で不変にし、satisfies で型制約を設ける）
export const YOU_TUBE_TOOL_NAMES = {
  // Video tools
  GET_VIDEO: "get_video",
  SEARCH_VIDEOS: "search_videos",

  // Channel tools
  GET_CHANNEL: "get_channel",
  LIST_CHANNEL_VIDEOS: "list_channel_videos",

  // Playlist tools
  GET_PLAYLIST: "get_playlist",
  GET_PLAYLIST_ITEMS: "get_playlist_items",

  // Comment tools
  GET_COMMENTS: "get_comments",
  GET_COMMENT_THREADS: "get_comment_threads",

  // Transcript tools
  GET_TRANSCRIPT_METADATA: "get_transcript_metadata",
  GET_TRANSCRIPT: "get_transcript",
} as const satisfies Record<string, ToolName>;

// ツールカテゴリ定義
export const TOOL_CATEGORIES = {
  VIDEO: "video",
  CHANNEL: "channel",
  PLAYLIST: "playlist",
  COMMENT: "comment",
  TRANSCRIPT: "transcript",
} as const;
