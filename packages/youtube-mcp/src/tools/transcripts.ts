import type { YouTubeApiService } from "@/services/youtubeApi.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { YOU_TUBE_TOOL_NAMES } from "@/constants/toolNames.js";
import { YtdlpService } from "@/services/ytdlpService.js";
import {
  GetTranscriptMetadataSchema,
  GetTranscriptSchema,
} from "@/types/index.js";

/**
 * 字幕ツールの定義
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
  {
    name: YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT,
    description: "動画の字幕を取得します（yt-dlpのインストールが必要）",
    inputSchema: {
      type: "object",
      properties: {
        videoId: {
          type: "string",
          description: "YouTube動画のID",
        },
        language: {
          type: "string",
          description: "言語コード（例: ja, en）",
        },
        startTime: {
          type: "number",
          description: "開始時間（秒）",
        },
        endTime: {
          type: "number",
          description: "終了時間（秒）",
        },
      },
      required: ["videoId", "language"],
    },
  },
];

// YtdlpService インスタンス（シングルトン）
let ytdlpService: YtdlpService | null = null;

const getYtdlpService = (): YtdlpService => {
  ytdlpService ??= new YtdlpService();
  return ytdlpService;
};

// テスト用のサービス設定関数
export const _setYtdlpServiceForTesting = (
  service: YtdlpService | null,
): void => {
  ytdlpService = service;
};

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

      case YOU_TUBE_TOOL_NAMES.GET_TRANSCRIPT: {
        const input = GetTranscriptSchema.parse(args);
        const service = getYtdlpService();
        const transcript = await service.getTranscript(
          input.videoId,
          input.language,
          input.startTime,
          input.endTime,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(transcript, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown transcript tool: ${toolName}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
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
