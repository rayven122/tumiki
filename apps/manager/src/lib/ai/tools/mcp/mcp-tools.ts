import { tool, type Tool } from "ai";
import { makeHttpProxyServerUrl } from "~/utils/url";
import { convertJsonSchemaToZod } from "./schema-converter";

/**
 * MCPツールの型定義（executeを持つツール）
 */
type McpTool = Tool<Parameters<typeof tool>[0]["parameters"], string>;

/**
 * MCPツール定義
 */
export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

/**
 * MCP JSON-RPC 2.0 レスポンス
 */
type McpJsonRpcResponse<T = unknown> = {
  jsonrpc: "2.0";
  id: string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

/**
 * tools/list レスポンス
 */
type ToolsListResult = {
  tools: McpToolDefinition[];
};

/**
 * tools/call レスポンス
 */
type ToolsCallResult = {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
};

/**
 * MCP Proxyに JSON-RPC 2.0 リクエストを送信
 */
const sendMcpRequest = async <T>(
  mcpServerId: string,
  accessToken: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> => {
  const proxyUrl = makeHttpProxyServerUrl(mcpServerId);

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `MCP Proxy request failed: ${response.status} ${response.statusText}`,
    );
  }

  const jsonResponse = (await response.json()) as McpJsonRpcResponse<T>;

  if (jsonResponse.error) {
    throw new Error(
      `MCP error: ${jsonResponse.error.message} (code: ${jsonResponse.error.code})`,
    );
  }

  if (!jsonResponse.result) {
    throw new Error("MCP response has no result");
  }

  return jsonResponse.result;
};

/**
 * MCPサーバーからツール一覧を取得
 */
export const getMcpTools = async (
  mcpServerId: string,
  accessToken: string,
): Promise<McpToolDefinition[]> => {
  try {
    const result = await sendMcpRequest<ToolsListResult>(
      mcpServerId,
      accessToken,
      "tools/list",
    );
    return result.tools ?? [];
  } catch (error) {
    console.error(`Failed to get tools from MCP server ${mcpServerId}:`, error);
    return [];
  }
};

/**
 * MCPツールを実行
 */
export const executeMcpTool = async (
  mcpServerId: string,
  accessToken: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> => {
  const result = await sendMcpRequest<ToolsCallResult>(
    mcpServerId,
    accessToken,
    "tools/call",
    {
      name: toolName,
      arguments: args,
    },
  );

  // レスポンスのcontentをテキストに変換
  if (result.isError) {
    const errorText = result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    throw new Error(`MCP tool error: ${errorText}`);
  }

  // テキストコンテンツを結合して返す
  return result.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
};

/**
 * MCPツール定義をVercel AI SDK tool形式に変換
 */
export const createMcpTool = (
  toolDef: McpToolDefinition,
  mcpServerId: string,
  accessToken: string,
) => {
  // JSON SchemaをZodスキーマに変換
  const zodSchema = convertJsonSchemaToZod(
    toolDef.inputSchema as Record<string, unknown>,
  );

  return tool({
    description: toolDef.description,
    parameters: zodSchema,
    execute: async (args) => {
      return executeMcpTool(
        mcpServerId,
        accessToken,
        toolDef.name,
        args as Record<string, unknown>,
      );
    },
  });
};

/**
 * 複数MCPサーバーからツールを取得してマージ
 *
 * ツール名形式: `{mcpServerId}__{originalToolName}`
 * これにより、異なるMCPサーバーの同名ツールを区別
 */
export const getMcpToolsFromServers = async (
  mcpServerIds: string[],
  accessToken: string,
): Promise<{
  tools: Record<string, McpTool>;
  toolNames: string[];
}> => {
  const allTools: Record<string, McpTool> = {};
  const allToolNames: string[] = [];

  // 並列でtools/list取得
  const results = await Promise.allSettled(
    mcpServerIds.map(async (mcpServerId) => {
      const tools = await getMcpTools(mcpServerId, accessToken);
      return { mcpServerId, tools };
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { mcpServerId, tools } = result.value;

      for (const toolDef of tools) {
        // ツール名にMCPサーバーIDをプレフィックス
        const uniqueToolName = `${mcpServerId}__${toolDef.name}`;
        allTools[uniqueToolName] = createMcpTool(
          toolDef,
          mcpServerId,
          accessToken,
        ) as McpTool;
        allToolNames.push(uniqueToolName);
      }
    } else {
      // 失敗したサーバーはスキップ（既にgetMcpToolsでログ出力済み）
      console.error("MCP server tools fetch failed:", result.reason);
    }
  }

  return { tools: allTools, toolNames: allToolNames };
};
