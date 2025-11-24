// cSpell:words cloudrun deepl
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Prisma } from "@prisma/client";

/**
 * MCP サーバーテンプレート定義の型 (ツールリスト付き)
 */
type McpServerTemplateWithTools =
  Prisma.McpServerTemplateCreateWithoutMcpToolsInput & {
    tools?: Tool[];
  };

/**
 * db に登録する MCP サーバーテンプレート一覧
 *
 * リモートMCPサーバー専用 (STREAMABLE_HTTPS / SSE トランスポート)
 * STDIO タイプは廃止されました
 */
export const MCP_SERVERS: McpServerTemplateWithTools[] = [
  // ========================================
  // Public Remote MCP Servers (認証なし)
  // ========================================
  {
    name: "Context7",
    description:
      "ライブラリドキュメント検索サービス - 最新のドキュメントをリアルタイムで取得",
    tags: ["ドキュメント", "検索", "ツール"],
    iconPath: "/logos/context7.svg",
    url: "https://mcp.context7.com/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: [],
    authType: "NONE" as const,
  },
  // ========================================
  // OAuth Remote MCP Servers (DCR対応)
  // ========================================
  {
    name: "Figma MCP",
    description:
      "Figma 公式MCPサーバー - デザインファイルの読み取りとコード生成",
    tags: ["デザイン", "UI/UX", "ツール"],
    iconPath: "/logos/figma.svg",
    url: "https://mcp.figma.com/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: [],
    authType: "OAUTH" as const,
    oauthProvider: "figma",
    oauthScopes: ["mcp:connect"],
    // OAuth認証が必要なためツールリストを定義
    // 最終更新: 2025-01-18 (Figma MCP Server)
    tools: [
      {
        name: "get_design_context",
        description: "Get the design context for a layer or selection",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_variable_defs",
        description: "Returns the variables and styles used in your selection",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_code_connect_map",
        description: "Retrieves node ID-to-code component mappings",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_screenshot",
        description: "Take a screenshot of your selection",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_design_system_rules",
        description:
          "Creates rule files for translating designs into frontend code",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_metadata",
        description:
          "Returns a sparse XML representation of your selection with basic properties",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_figjam",
        description:
          "Returns FigJam diagram metadata in XML format with screenshots",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "whoami",
        description:
          "Returns authenticated user identity including email and plan",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  },
  {
    name: "Linear MCP",
    description:
      "Linear プロジェクト管理サービス - イシュー、プロジェクト、チーム情報へのアクセス",
    tags: ["プロジェクト管理", "イシュー管理", "ツール"],
    iconPath: "/logos/linear.svg",
    url: "https://mcp.linear.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    envVarKeys: [],
    authType: "OAUTH" as const,
    oauthProvider: "linear",
    // OAuth認証が必要なためツールリストを定義
    // 最終更新: 2025-01-18 (Linear MCP v1.0)
    tools: [
      {
        name: "list_comments",
        description: "List comments for a specific Linear issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "string", description: "The issue ID" },
          },
          required: ["issueId"],
        },
      },
      {
        name: "create_comment",
        description: "Create a comment on a specific Linear issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "string", description: "The issue ID" },
            body: {
              type: "string",
              description: "The content of the comment as Markdown",
            },
            parentId: {
              type: "string",
              description: "A parent comment ID to reply to",
            },
          },
          required: ["issueId", "body"],
        },
      },
      {
        name: "list_cycles",
        description: "Retrieve cycles for a specific Linear team",
        inputSchema: {
          type: "object",
          properties: {
            teamId: { type: "string", description: "The team ID" },
            type: {
              type: "string",
              enum: ["current", "previous", "next"],
              description:
                "Retrieve the current, previous, next, or all cycles",
            },
          },
          required: ["teamId"],
        },
      },
      {
        name: "get_document",
        description: "Retrieve a Linear document by ID or slug",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "The document ID or slug" },
          },
          required: ["id"],
        },
      },
      {
        name: "list_documents",
        description: "List documents in the user's Linear workspace",
        inputSchema: {
          type: "object",
          properties: {
            after: { type: "string", description: "An ID to start from" },
            before: { type: "string", description: "An ID to end at" },
            limit: {
              type: "number",
              default: 50,
              maximum: 250,
              description: "The number of results to return (Max is 250)",
            },
            orderBy: {
              type: "string",
              enum: ["createdAt", "updatedAt"],
              default: "updatedAt",
              description: "The order in which to return results",
            },
          },
        },
      },
      {
        name: "get_issue",
        description:
          "Retrieve detailed information about an issue by ID, including attachments and git branch name",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "The issue ID" },
          },
          required: ["id"],
        },
      },
      {
        name: "list_issues",
        description:
          'List issues in the user\'s Linear workspace. For my issues, use "me" as the assignee.',
        inputSchema: {
          type: "object",
          properties: {
            after: { type: "string", description: "An ID to start from" },
            before: { type: "string", description: "An ID to end at" },
            limit: {
              type: "number",
              default: 50,
              maximum: 250,
              description: "The number of results to return (Max is 250)",
            },
            orderBy: {
              type: "string",
              enum: ["createdAt", "updatedAt"],
              default: "updatedAt",
            },
            assignee: {
              type: "string",
              description:
                'The assignee to filter by (User ID, name, email, or "me")',
            },
            team: {
              type: "string",
              description: "The team name or ID to filter by",
            },
            state: {
              type: "string",
              description: "The state name or ID to filter by",
            },
            project: {
              type: "string",
              description: "The project name or ID to filter by",
            },
            label: {
              type: "string",
              description: "A label name or ID to filter by",
            },
          },
        },
      },
      {
        name: "create_issue",
        description: "Create a new Linear issue",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "The issue title" },
            description: {
              type: "string",
              description: "The issue description as Markdown",
            },
            team: {
              type: "string",
              description: "The team name or ID",
            },
            assignee: {
              type: "string",
              description: 'The user to assign (User ID, name, email, or "me")',
            },
            priority: {
              type: "number",
              description:
                "The issue priority. 0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low",
            },
            state: {
              type: "string",
              description: "The issue state type, name, or ID",
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Array of label names or IDs to set on the issue",
            },
          },
          required: ["title", "team"],
        },
      },
      {
        name: "update_issue",
        description: "Update an existing Linear issue",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "The issue ID" },
            title: { type: "string", description: "The issue title" },
            description: {
              type: "string",
              description: "The issue description as Markdown",
            },
            assignee: {
              type: "string",
              description: 'The user to assign (User ID, name, email, or "me")',
            },
            priority: { type: "number", description: "The issue priority" },
            state: {
              type: "string",
              description: "The issue state type, name, or ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "list_issue_statuses",
        description: "List available issue statuses in a Linear team",
        inputSchema: {
          type: "object",
          properties: {
            team: { type: "string", description: "The team name or ID" },
          },
          required: ["team"],
        },
      },
      {
        name: "get_issue_status",
        description:
          "Retrieve detailed information about an issue status in Linear by name or ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the issue status to retrieve",
            },
            name: {
              type: "string",
              description: "The name of the issue status to retrieve",
            },
            team: { type: "string", description: "The team name or ID" },
          },
          required: ["id", "name", "team"],
        },
      },
      {
        name: "list_issue_labels",
        description:
          "List available issue labels in a Linear workspace or team",
        inputSchema: {
          type: "object",
          properties: {
            team: { type: "string", description: "The team name or ID" },
            name: { type: "string", description: "Filter by label name" },
            limit: {
              type: "number",
              default: 50,
              maximum: 250,
              description: "The number of results to return (Max is 250)",
            },
          },
        },
      },
      {
        name: "create_issue_label",
        description: "Create a new Linear issue label",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "The name of the label" },
            color: {
              type: "string",
              description: "The color of the label (hex color code)",
            },
            teamId: {
              type: "string",
              description:
                "The team UUID. If not provided, the label will be created as a workspace label",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "list_projects",
        description: "List projects in the user's Linear workspace",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              default: 50,
              maximum: 250,
              description: "The number of results to return (Max is 250)",
            },
            team: {
              type: "string",
              description: "The team name or ID to filter by",
            },
          },
        },
      },
      {
        name: "get_project",
        description: "Retrieve details of a specific project in Linear",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The ID or name of the project to retrieve",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "create_project",
        description: "Create a new project in Linear",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "A descriptive name of the project",
            },
            description: {
              type: "string",
              description: "The full project description in Markdown format",
            },
            team: { type: "string", description: "The team name or ID" },
          },
          required: ["name", "team"],
        },
      },
      {
        name: "update_project",
        description: "Update an existing Linear project",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the project to update",
            },
            name: {
              type: "string",
              description: "The new name of the project",
            },
            description: {
              type: "string",
              description: "The full project description in Markdown format",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "list_project_labels",
        description: "List available project labels in the Linear workspace",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Filter by label name" },
            limit: {
              type: "number",
              default: 50,
              maximum: 250,
              description: "The number of results to return (Max is 250)",
            },
          },
        },
      },
      {
        name: "list_teams",
        description: "List teams in the user's Linear workspace",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              default: 50,
              maximum: 250,
              description: "The number of results to return (Max is 250)",
            },
          },
        },
      },
      {
        name: "get_team",
        description: "Retrieve details of a specific Linear team",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The UUID, key, or name of the team to retrieve",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "list_users",
        description: "Retrieve users in the Linear workspace",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Optional query to filter users by name or email",
            },
          },
        },
      },
      {
        name: "get_user",
        description: "Retrieve details of a specific Linear user",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                'The user to retrieve (User ID, name, email, or "me")',
            },
          },
          required: ["query"],
        },
      },
      {
        name: "search_documentation",
        description:
          "Search Linear's documentation to learn about features and usage",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query" },
            page: {
              type: "number",
              default: 0,
              description: "The page number",
            },
          },
          required: ["query"],
        },
      },
    ],
  },
  // ========================================
  // Cloud Run Remote MCP Servers
  // ========================================
  // Cloud Run にデプロイされた MCP サーバー
  // URL は実際のデプロイ先に置き換える必要があります
  // 設定方法は docs/cloudrun-mcp-integration.md を参照
  {
    name: "DeepL MCP",
    description: "DeepL 翻訳サービス",
    tags: ["翻訳", "ツール"],
    iconPath: "/logos/deepl.svg",
    url: "https://deepl-mcp-67726874216.asia-northeast1.run.app/mcp",
    transportType: "STREAMABLE_HTTPS" as const,
    // Cloud Run認証はgoogle-auth-libraryで自動取得
    // envVarKeysはMCPサーバー用のカスタムヘッダーのみ
    envVarKeys: ["X-DeepL-API-Key"],
    authType: "NONE" as const,
    useCloudRunIam: true,
    args: [],
    oauthScopes: [],
  },
];
