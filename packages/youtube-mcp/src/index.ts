#!/usr/bin/env node

import "dotenv/config";

import { startMcpServer } from "./server.js";

const main = async () => {
  try {
    // YouTube API キーの確認
    if (!process.env.YOUTUBE_API_KEY) {
      console.error("Error: YOUTUBE_API_KEY environment variable is not set");
      console.error(
        "Please set your YouTube Data API v3 key in the environment variables",
      );
      process.exit(1);
    }

    // MCP サーバーを起動
    await startMcpServer();
  } catch (error: unknown) {
    console.error(
      "Failed to start YouTube MCP Server:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
};

// エラーハンドリング
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// メイン関数を実行
void main();
