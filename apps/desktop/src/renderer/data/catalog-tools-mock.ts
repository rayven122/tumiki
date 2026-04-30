import type { CatalogTool } from "../../types/catalog";

/**
 * カタログ名 -> ツール一覧のモック辞書。
 * 本来は McpCatalog テーブルに持たせるべき情報だが、UI 先行実装のため暫定で保持。
 * 将来 Prisma 拡張時はこのファイルを削除し、IPC 経由で取得する。
 */
export const CATALOG_TOOLS_MOCK: Record<string, CatalogTool[]> = {
  "LINE Bot MCP": [
    {
      name: "push_text_message",
      description:
        "Push a simple text message to a user via LINE. Use this for sending plain text messages without formatting.",
    },
    {
      name: "broadcast_text_message",
      description:
        "Broadcast a simple text message via LINE to all users who have followed your LINE Official Account. Use this for sending plain text messages without formatting. Please be aware that this message will be sent to all users.",
    },
    {
      name: "broadcast_flex_message",
      description:
        "Broadcast a highly customizable flex message via LINE to all users who have added your LINE Official Account. Supports both bubble (single container) and carousel (multiple swipeable bubbles) layouts. Please be aware that this message will be sent to all users.",
    },
    {
      name: "delete_rich_menu",
      description: "Delete a rich menu from your LINE Official Account.",
    },
    {
      name: "set_rich_menu_default",
      description: "Set a rich menu as the default rich menu.",
    },
    {
      name: "get_profile",
      description:
        "Get detailed profile information of a LINE user including display name, profile picture URL, status message and language.",
    },
    {
      name: "get_message_quota",
      description:
        "Get the message quota and consumption of the LINE Official Account. This shows the monthly message limit and current usage.",
    },
    {
      name: "push_flex_message",
      description:
        "Push a highly customizable flex message to a user via LINE. Supports both bubble (single container) and carousel (multiple swipeable bubbles) layouts.",
    },
    {
      name: "get_rich_menu_list",
      description:
        "Get the list of rich menus associated with your LINE Official Account.",
    },
    {
      name: "create_rich_menu",
      description:
        "Create a new rich menu on your LINE Official Account with custom area definitions.",
    },
  ],
  "Figma MCP": [
    {
      name: "get_file",
      description:
        "Retrieve a Figma file including its document structure, components, and styles.",
    },
    {
      name: "get_file_nodes",
      description: "Retrieve specific nodes from a Figma file by node IDs.",
    },
    {
      name: "get_image",
      description:
        "Export images of Figma nodes at various scales and formats (PNG, JPG, SVG, PDF).",
    },
    {
      name: "get_comments",
      description: "List all comments associated with a Figma file.",
    },
    {
      name: "post_comment",
      description:
        "Post a comment to a specific location or node within a Figma file.",
    },
  ],
  "Neon MCP": [
    {
      name: "list_projects",
      description:
        "List all Neon projects accessible with the current API key.",
    },
    {
      name: "create_project",
      description:
        "Create a new Neon Postgres project with specified region and settings.",
    },
    {
      name: "run_sql",
      description:
        "Execute a SQL query against a branch of a Neon project. Supports parameterized queries.",
    },
    {
      name: "describe_table",
      description:
        "Describe the schema of a table including columns, types, and constraints.",
    },
  ],
  "Supabase MCP": [
    {
      name: "list_tables",
      description: "List all tables in the Supabase database schema.",
    },
    {
      name: "run_sql",
      description:
        "Execute a raw SQL query against the Supabase Postgres database.",
    },
    {
      name: "invoke_edge_function",
      description:
        "Invoke a Supabase Edge Function by name with a JSON payload.",
    },
  ],
};
