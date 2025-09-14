import type { YouTubeApiService } from "@/services/youtubeApi.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { YOU_TUBE_TOOL_NAMES } from "@/constants/toolNames.js";
import { GetTranscriptMetadataSchema } from "@/types/index.js";

/**
 * 字幕メタデータ取得ツールの定義
 */
export const transcriptTools = [
  {
    name: YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT_METADATA,
    description: "動画で利用可能な字幕のメタデータを取得します",
    inputSchema: {
      type: "object",
      properties: {
        videoId: {
          type: "string",
          description: "YouTube動画のID",
        },
      },
      required: ["videoId"],
    },
  },
];

/**
 * 字幕ツールのハンドラー
 * @param toolName ツール名
 * @param args 引数
 * @param youtubeApi YouTubeAPIサービス
 * @returns ツールの実行結果
 */
export async function handleTranscriptTool(
  toolName: string,
  args: unknown,
  youtubeApi: YouTubeApiService,
): Promise<CallToolResult> {
  try {
    switch (toolName) {
      case YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT_METADATA: {
        const input = GetTranscriptMetadataSchema.parse(args);
        const metadata = await youtubeApi.getTranscriptMetadata(input.videoId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(metadata, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown transcript tool: ${toolName}`);
    }
  } catch (error: unknown) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error:
                error instanceof Error ? error.message : "エラーが発生しました",
              toolName,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}
