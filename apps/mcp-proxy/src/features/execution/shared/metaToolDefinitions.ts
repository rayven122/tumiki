/**
 * Dynamic Search 用のメタツール定義（統合版）
 *
 * dynamicSearch が有効な場合、これら3つのツールのみが公開される。
 * CE/EE両方で使用可能（CE版では handleMetaTool がエラーを返す）。
 *
 * このファイルは以下の重複を統合:
 * - features/dynamicSearch/metaToolDefinitions.ee.ts
 * - features/chat/chatMcpTools.ts の DYNAMIC_SEARCH_META_TOOLS
 * - features/mcp/commands/callTool/callToolHandler.ts の META_TOOL_NAMES
 */

/**
 * メタツール定義の型
 * AI SDK と MCP SDK 両方で使用可能な共通型
 */
export type MetaToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

/**
 * search_tools メタツール定義
 * クエリに関連するツールをセマンティック検索する
 */
export const SEARCH_TOOLS_DEFINITION: MetaToolDefinition = {
  name: "search_tools",
  description:
    "利用可能なツールをクエリで検索します。自然言語でツールの機能を説明すると、関連するツールを返します。",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "検索クエリ（例: 'ファイルを作成する', 'GitHubのissueを取得'）",
      },
      limit: {
        type: "number",
        description: "返す結果の最大数（デフォルト: 10）",
        default: 10,
      },
    },
    required: ["query"],
  },
};

/**
 * describe_tools メタツール定義
 * 指定されたツールの詳細スキーマを取得する
 */
export const DESCRIBE_TOOLS_DEFINITION: MetaToolDefinition = {
  name: "describe_tools",
  description:
    "指定されたツールの詳細な入力スキーマを取得します。search_toolsで見つけたツールの詳細を確認するために使用します。",
  inputSchema: {
    type: "object",
    properties: {
      toolNames: {
        type: "array",
        items: {
          type: "string",
        },
        description: "スキーマを取得するツール名の配列",
      },
    },
    required: ["toolNames"],
  },
};

/**
 * execute_tool メタツール定義
 * 指定されたツールを実行する
 */
export const EXECUTE_TOOL_DEFINITION: MetaToolDefinition = {
  name: "execute_tool",
  description:
    "指定されたツールを実行します。事前にdescribe_toolsでスキーマを確認し、適切な引数を渡してください。",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "実行するツール名",
      },
      arguments: {
        type: "object",
        description: "ツールに渡す引数",
        additionalProperties: true,
      },
    },
    required: ["name"],
  },
};

/**
 * 全メタツール定義の配列
 */
export const DYNAMIC_SEARCH_META_TOOLS: MetaToolDefinition[] = [
  SEARCH_TOOLS_DEFINITION,
  DESCRIBE_TOOLS_DEFINITION,
  EXECUTE_TOOL_DEFINITION,
];

/**
 * メタツール名のセット（高速検索用）
 */
export const META_TOOL_NAMES = new Set(
  DYNAMIC_SEARCH_META_TOOLS.map((tool) => tool.name),
);

/**
 * 指定された名前がメタツールかどうかを判定
 */
export const isMetaToolName = (toolName: string): boolean =>
  META_TOOL_NAMES.has(toolName);
