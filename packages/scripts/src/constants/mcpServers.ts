import type { Prisma } from "@prisma/client";

/**
 * db に登録する MCP サーバー一覧
 */
export const MCP_SERVERS = [
  {
    name: "Notion MCP",
    iconPath: "/logos/notion.svg",
    command: "node",
    args: ["node_modules/@suekou/mcp-notion-server/build/index.js"],
    envVars: ["NOTION_API_TOKEN"],
    isPublic: true,
  },
  {
    name: "GitHub MCP",
    iconPath: "/logos/github.svg",
    command: "node",
    args: ["node_modules/@modelcontextprotocol/server-github/dist/index.js"],
    envVars: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
    isPublic: true,
  },
  {
    name: "Context7",
    iconPath: "/logos/context7.svg",
    command: "node",
    args: ["node_modules/@upstash/context7-mcp/dist/index.js"],
    isPublic: true,
  },
] as const satisfies Prisma.McpServerCreateWithoutToolsInput[];
