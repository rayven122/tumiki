import type { YouTubeApiService } from "@/services/YoutubeApiService/index.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { YOU_TUBE_TOOL_NAMES } from "@/constants/toolNames.js";
import { GetCommentsSchema, GetCommentThreadsSchema } from "@/types/index.js";

export const commentTools: Tool[] = [
  {
    name: YOU_TUBE_TOOL_NAMES.GET_COMMENT_THREADS,
    description: "YouTube動画のコメントスレッドを取得します",
    inputSchema: {
      type: "object",
      properties: {
        videoId: {
          type: "string",
          description: "YouTube動画のID",
        },
        maxResults: {
          type: "number",
          description: "最大取得件数（1-100）",
          minimum: 1,
          maximum: 100,
          default: 20,
        },
        pageToken: {
          type: "string",
          description: "ページネーショントークン",
        },
        order: {
          type: "string",
          enum: ["relevance", "time"],
          description: "並び順（relevance: 関連性順, time: 投稿時刻順）",
          default: "relevance",
        },
      },
      required: ["videoId"],
    },
  },
  {
    name: YOU_TUBE_TOOL_NAMES.GET_COMMENT_REPLIES,
    description: "コメントスレッドへの返信を取得します",
    inputSchema: {
      type: "object",
      properties: {
        parentId: {
          type: "string",
          description: "親コメントのID",
        },
        maxResults: {
          type: "number",
          description: "最大取得件数（1-100）",
          minimum: 1,
          maximum: 100,
          default: 20,
        },
        pageToken: {
          type: "string",
          description: "ページネーショントークン",
        },
      },
      required: ["parentId"],
    },
  },
];

export const handleCommentTool = async (
  toolName: string,
  args: Record<string, unknown>,
  youtubeApi: YouTubeApiService,
): Promise<CallToolResult> => {
  switch (toolName) {
    case YOU_TUBE_TOOL_NAMES.GET_COMMENT_THREADS: {
      const validatedArgs = GetCommentThreadsSchema.parse(args);
      const result = await youtubeApi.getCommentThreads(
        validatedArgs.videoId,
        validatedArgs.maxResults,
        validatedArgs.pageToken,
        validatedArgs.order,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case YOU_TUBE_TOOL_NAMES.GET_COMMENT_REPLIES: {
      const validatedArgs = GetCommentsSchema.parse(args);
      const result = await youtubeApi.getCommentReplies(
        validatedArgs.parentId,
        validatedArgs.maxResults,
        validatedArgs.pageToken,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown comment tool: ${toolName}`);
  }
};
