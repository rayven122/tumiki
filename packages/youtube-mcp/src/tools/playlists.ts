import type { YouTubeApiService } from "@/services/YoutubeApiService/index.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { YOU_TUBE_TOOL_NAMES } from "@/constants/toolNames.js";
import { GetPlaylistItemsSchema, GetPlaylistSchema } from "@/types/index.js";

export const playlistTools: Tool[] = [
  {
    name: YOU_TUBE_TOOL_NAMES.GET_PLAYLIST,
    description: "YouTubeプレイリストの詳細情報を取得します",
    inputSchema: {
      type: "object",
      properties: {
        playlistId: {
          type: "string",
          description: "YouTubeプレイリストのID",
        },
      },
      required: ["playlistId"],
    },
  },
  {
    name: YOU_TUBE_TOOL_NAMES.GET_PLAYLIST_ITEMS,
    description: "YouTubeプレイリスト内の動画一覧を取得します",
    inputSchema: {
      type: "object",
      properties: {
        playlistId: {
          type: "string",
          description: "YouTubeプレイリストのID",
        },
        maxResults: {
          type: "number",
          description: "最大取得件数（1-50）",
          minimum: 1,
          maximum: 50,
          default: 10,
        },
      },
      required: ["playlistId"],
    },
  },
];

export const handlePlaylistTool = async (
  toolName: string,
  args: Record<string, unknown>,
  youtubeApi: YouTubeApiService,
): Promise<CallToolResult> => {
  switch (toolName) {
    case YOU_TUBE_TOOL_NAMES.GET_PLAYLIST: {
      const validatedArgs = GetPlaylistSchema.parse(args);
      const playlist = await youtubeApi.getPlaylist(validatedArgs.playlistId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(playlist, null, 2),
          },
        ],
      };
    }

    case YOU_TUBE_TOOL_NAMES.GET_PLAYLIST_ITEMS: {
      const validatedArgs = GetPlaylistItemsSchema.parse(args);
      const items = await youtubeApi.getPlaylistItems(
        validatedArgs.playlistId,
        validatedArgs.maxResults,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(items, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown playlist tool: ${toolName}`);
  }
};
