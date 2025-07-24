import type { Prisma } from "@tumiki/db/prisma";
import { AuthType } from "@tumiki/db/prisma";

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
    authType: AuthType.OAUTH,
    oauthProvider: "notion",
    oauthScopes: ["read_content", "insert_content", "update_content"],
    isPublic: true,
  },
  {
    name: "GitHub MCP",
    iconPath: "/logos/github.svg",
    command: "node",
    args: ["mcp/github.mcp-server.js"],
    envVars: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
    authType: AuthType.OAUTH,
    oauthProvider: "github",
    oauthScopes: ["repo", "read:user"],
    isPublic: true,
  },
  {
    name: "Slack MCP",
    iconPath: "/logos/slack.svg",
    command: "node",
    args: ["mcp/slack.mcp-server.js"],
    envVars: ["SLACK_TOKEN"],
    authType: AuthType.OAUTH,
    oauthProvider: "slack",
    oauthScopes: ["channels:read", "chat:write", "users:read"],
    isPublic: true,
  },
  {
    name: "Google Drive MCP",
    iconPath: "/logos/google-drive.svg",
    command: "node",
    args: ["mcp/google-drive.mcp-server.js"],
    envVars: ["GOOGLE_TOKEN"],
    authType: AuthType.OAUTH,
    oauthProvider: "google",
    oauthScopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
    ],
    isPublic: true,
  },
  {
    name: "LinkedIn MCP",
    iconPath: "/logos/linkedin.svg",
    command: "node",
    args: ["mcp/linkedin.mcp-server.js"],
    envVars: ["LINKEDIN_TOKEN"],
    authType: AuthType.OAUTH,
    oauthProvider: "linkedin",
    oauthScopes: ["r_liteprofile", "r_emailaddress", "w_member_social"],
    isPublic: true,
  },
] as const satisfies Prisma.McpServerCreateWithoutToolsInput[];
