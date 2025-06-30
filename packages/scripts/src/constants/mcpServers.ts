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
  {
    name: "Playwright MCP",
    iconPath: "/logos/playwright.svg",
    command: "node",
    args: ["node_modules/@playwright/mcp/cli.js"],
    isPublic: true,
  },
  {
    name: "Task Master AI",
    iconPath: "/logos/task-master.svg",
    command: "node",
    args: ["node_modules/task-master-ai/index.js"],
    envVars: [
      "ANTHROPIC_API_KEY",
      "PERPLEXITY_API_KEY",
      "OPENAI_API_KEY",
      "GOOGLE_API_KEY",
      "MISTRAL_API_KEY",
      "OPENROUTER_API_KEY",
      "XAI_API_KEY",
      "AZURE_OPENAI_API_KEY",
      "OLLAMA_API_KEY",
    ],
    isPublic: true,
  },
  {
    name: "Figma Context",
    iconPath: "/logos/figma.svg",
    command: "node",
    args: [
      "node_modules/figma-developer-mcp/dist/index.js",
      "--figma-api-key=FIGMA_API_KEY",
      "--stdio",
    ],
    envVars: ["FIGMA_API_KEY"],
    isPublic: true,
  },
] as const satisfies Prisma.McpServerCreateWithoutToolsInput[];
