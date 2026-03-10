/**
 * MCP ツール動的プロンプト生成
 */

const DYNAMIC_SEARCH_SUFFIXES = [
  "__search_tools",
  "__describe_tools",
  "__execute_tool",
] as const;

/**
 * dynamicSearchモードのメタツール名かどうかを判定
 * メタツールは `{mcpServerId}__search_tools` のような形式
 */
const isDynamicSearchMetaTool = (toolName: string): boolean =>
  DYNAMIC_SEARCH_SUFFIXES.some((suffix) => toolName.endsWith(suffix));

/**
 * MCPツールに関するプロンプトを生成
 * dynamicSearchモード（メタツールのみ）の場合は詳しい使い方を説明
 */
export const getMcpToolsPrompt = (mcpToolNames: string[]): string => {
  if (mcpToolNames.length === 0) {
    return "";
  }

  // 全ツールがメタツールの場合は dynamicSearch モード
  const isDynamicSearchMode = mcpToolNames.every(isDynamicSearchMetaTool);

  if (isDynamicSearchMode) {
    return `
## Available MCP Tools (Dynamic Search Mode)

You have access to a dynamic tool discovery system. Use the following workflow to find and execute tools:

1. **search_tools**: First, search for relevant tools using a natural language query.
   - Example: To find Linear-related tools, call search_tools with query "Linear team information" or "get Linear teams"
   - This will return a list of available tools matching your query

2. **describe_tools**: Get the detailed input schema for specific tools.
   - Use this after search_tools to understand what parameters a tool needs

3. **execute_tool**: Execute a tool with the required arguments.
   - Use this to run the actual tool after you know its name and required parameters

**Important**: When a user asks for something (e.g., "get my Linear team info"), you MUST:
1. First call search_tools to find relevant tools
2. Then call describe_tools to understand the tool's parameters
3. Finally call execute_tool to perform the action

Available tools: ${mcpToolNames.join(", ")}
`;
  }

  return `
## Available MCP Tools

You have access to MCP tools: ${mcpToolNames.join(", ")}

Use these tools when appropriate. You can chain multiple tool calls in sequence.
`;
};
