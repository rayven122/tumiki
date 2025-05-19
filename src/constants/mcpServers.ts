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
    name: "Filesystem MCP",
    iconPath: "/logos/filesystem.svg",
    command: "node",
    args: [
      "mcp/filesystem.mcp-server.js",
      "/Users/suzusanhidetoshi/Documents/tumiki",
    ],
    envVars: [],
    isPublic: true,
  },
] as const satisfies Prisma.McpServerCreateWithoutToolsInput[];
