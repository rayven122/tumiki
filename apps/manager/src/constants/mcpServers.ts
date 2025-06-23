import type { Prisma } from "@tumiki/db/prisma";

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
] as const satisfies Prisma.McpServerCreateWithoutToolsInput[];
