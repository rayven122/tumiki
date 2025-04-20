import type { Prisma } from "@prisma/client";

/**
 * db に登録する MCP サーバー一覧
 */
export const MCP_SERVERS = [
  {
    name: "Notion MCP",
    command: "/root/.nix-profile/bin/node",
    args: ["node_modules/@suekou/mcp-notion-server/build/index.js"],
    envVars: ["NOTION_API_TOKEN"],
    isPublic: true,
  },
  {
    name: "GitHub MCP",
    command: "/root/.nix-profile/bin/node",
    args: ["node_modules/@modelcontextprotocol/server-github/dist/index.js"],
    envVars: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
    isPublic: true,
  },
] as const satisfies Prisma.McpServerCreateWithoutToolsInput[];
