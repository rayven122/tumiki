import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

import type { YouTubeApiService } from "~/services/youtubeApi.js";
import { TOOL_NAMES } from "~/constants/toolNames.js";
import { GetChannelSchema, ListChannelVideosSchema } from "~/types/index.js";

export const channelTools: Tool[] = [
  {
    name: TOOL_NAMES.GET_CHANNEL,
    description: "YouTubeチャンネルの詳細情報を取得します",
    inputSchema: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description: "YouTubeチャンネルのID",
        },
      },
      required: ["channelId"],
    },
  },
  {
    name: TOOL_NAMES.LIST_CHANNEL_VIDEOS,
    description: "指定したYouTubeチャンネルの動画一覧を取得します",
    inputSchema: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description: "YouTubeチャンネルのID",
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
          enum: ["date", "rating", "viewCount", "title"],
          description: "並び順",
          default: "date",
        },
      },
      required: ["channelId"],
    },
  },
];

export const handleChannelTool = async (
  toolName: string,
  args: Record<string, unknown>,
  youtubeApi: YouTubeApiService,
): Promise<CallToolResult> => {
  try {
    switch (toolName) {
      case TOOL_NAMES.GET_CHANNEL: {
        const validatedArgs = GetChannelSchema.parse(args);
        const channel = await youtubeApi.getChannel(validatedArgs.channelId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(channel, null, 2),
            },
          ],
        };
      }

      case TOOL_NAMES.LIST_CHANNEL_VIDEOS: {
        const validatedArgs = ListChannelVideosSchema.parse(args);
        const videos = await youtubeApi.listChannelVideos(
          validatedArgs.channelId,
          validatedArgs.maxResults,
          validatedArgs.order,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(videos, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown channel tool: ${toolName}`);
    }
  } catch (error: unknown) {
    // エラーメッセージをよりユーザーフレンドリーに
    if (error instanceof Error) {
      if (error.message.includes("Channel not found")) {
        throw new Error(
          `チャンネルが見つかりません: ${args.channelId as string}`,
        );
      }
      throw error;
    }
    throw new Error(`予期しないエラーが発生しました: ${String(error)}`);
  }
};
