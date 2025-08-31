import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

import type { YouTubeApiService } from "~/services/youtubeApi.js";
import { TOOL_NAMES } from "~/constants/toolNames.js";
import { GetVideoSchema, SearchVideosSchema } from "~/types/index.js";

export const videoTools: Tool[] = [
  {
    name: TOOL_NAMES.GET_VIDEO,
    description: "YouTube動画の詳細情報を取得します",
    inputSchema: {
      type: "object",
      properties: {
        videoId: {
          type: "string",
          description: "YouTube動画のID",
        },
        parts: {
          type: "array",
          items: {
            type: "string",
            enum: ["snippet", "statistics", "contentDetails"],
          },
          description: "取得する情報の種類",
        },
      },
      required: ["videoId"],
    },
  },
  {
    name: TOOL_NAMES.SEARCH_VIDEOS,
    description: "YouTube動画を検索します",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "検索クエリ",
        },
        maxResults: {
          type: "number",
          description: "最大取得件数（1-50）",
          minimum: 1,
          maximum: 50,
          default: 10,
        },
        order: {
          type: "string",
          enum: ["relevance", "date", "rating", "viewCount", "title"],
          description: "並び順",
          default: "relevance",
        },
        type: {
          type: "string",
          enum: ["video", "channel", "playlist"],
          description: "検索対象のタイプ",
          default: "video",
        },
      },
      required: ["query"],
    },
  },
];

export const handleVideoTool = async (
  toolName: string,
  args: Record<string, unknown>,
  youtubeApi: YouTubeApiService,
): Promise<CallToolResult> => {
  switch (toolName) {
    case TOOL_NAMES.GET_VIDEO: {
      const validatedArgs = GetVideoSchema.parse(args);
      const video = await youtubeApi.getVideo(
        validatedArgs.videoId,
        validatedArgs.parts,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(video, null, 2),
          },
        ],
      };
    }

    case TOOL_NAMES.SEARCH_VIDEOS: {
      const validatedArgs = SearchVideosSchema.parse(args);
      const results = await youtubeApi.searchVideos(
        validatedArgs.query,
        validatedArgs.maxResults,
        validatedArgs.order,
        validatedArgs.type,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown video tool: ${toolName}`);
  }
};
