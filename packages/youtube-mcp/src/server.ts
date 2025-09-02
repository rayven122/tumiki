import { TOOL_NAMES } from "@/constants/toolNames.js";
import { YouTubeApiService } from "@/services/youtubeApi.js";
import { channelTools, handleChannelTool } from "@/tools/channels.js";
import { handlePlaylistTool, playlistTools } from "@/tools/playlists.js";
import { handleVideoTool, videoTools } from "@/tools/videos.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export const startMcpServer = async () => {
  // 環境変数から YouTube API キーを取得
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY environment variable is required");
  }

  // サービスのインスタンス化
  const youtubeApi = new YouTubeApiService(apiKey);

  // MCP サーバーの初期化
  const server = new Server(
    {
      name: "youtube-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // ツール一覧の取得ハンドラー
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: [...videoTools, ...channelTools, ...playlistTools],
    };
  });

  // ツール実行ハンドラー
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: args } = request.params;

    try {
      // 動画関連ツール
      if (
        toolName === TOOL_NAMES.GET_VIDEO ||
        toolName === TOOL_NAMES.SEARCH_VIDEOS
      ) {
        return await handleVideoTool(toolName, args ?? {}, youtubeApi);
      }

      // チャンネル関連ツール
      if (
        toolName === TOOL_NAMES.GET_CHANNEL ||
        toolName === TOOL_NAMES.LIST_CHANNEL_VIDEOS
      ) {
        return await handleChannelTool(toolName, args ?? {}, youtubeApi);
      }

      // プレイリスト関連ツール
      if (
        toolName === TOOL_NAMES.GET_PLAYLIST ||
        toolName === TOOL_NAMES.GET_PLAYLIST_ITEMS
      ) {
        return await handlePlaylistTool(toolName, args ?? {}, youtubeApi);
      }

      throw new Error(`Unknown tool: ${toolName}`);
    } catch (error: unknown) {
      // エラーハンドリング
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // STDIO トランスポートでサーバーを起動
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("YouTube MCP Server is running");
};
