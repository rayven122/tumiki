import type { Prisma } from "@prisma/client";

/**
 * db に登録する MCP サーバー一覧
 */
export const MCP_SERVERS = [
  {
    name: "Notion MCP",
    iconPath: "/logos/notion.svg",
    command: "node",
    args: ["mcp/notion.mcp-server.js"],
    envVars: ["NOTION_API_TOKEN"],
    isPublic: true,
  },
  {
    name: "GitHub MCP",
    iconPath: "/logos/github.svg",
    command: "node",
    args: ["mcp/github.mcp-server.js"],
    envVars: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
    isPublic: true,
  },
  {
    name: "Slack MCP",
    iconPath: "/logos/slack.svg",
    command: "node",
    args: ["mcp/slack.mcp-server.js"],
    envVars: [
      "SLACK_BOT_TOKEN",
      "SLACK_TEAM_ID",
      "SLACK_CHANNEL_IDS"
    ],
    isPublic: true,
  },
  {
    name: "LINE Bot MCP",
    iconPath: "/logos/line.svg",
    command: "npx",
    args: ["mcp/line.mcp-server.js"],
    envVars: [
      "CHANNEL_ACCESS_TOKEN",
      "DESTINATION_USER_ID"
    ],
    isPublic: true,
  }
] as const satisfies Prisma.McpServerCreateWithoutToolsInput[];
