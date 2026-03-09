import { processPool } from "../../../../infrastructure/process/processPool.js";
import { mapHeadersToEnv } from "../../../../domain/services/envMapper.js";
import type { McpServerConfig } from "../../../../domain/types/mcpServer.js";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../shared/types/jsonRpc.js";

export type ForwardRequestCommand = {
  readonly serverConfig: McpServerConfig;
  readonly headers: Record<string, string | undefined>;
  readonly request: JsonRpcRequest;
};

/**
 * JSON-RPCリクエストをMCPプロセスに転送
 */
export const forwardRequestCommand = async (
  command: ForwardRequestCommand,
): Promise<JsonRpcResponse> => {
  const { serverConfig, headers, request } = command;

  // ヘッダーを環境変数に変換
  const env = mapHeadersToEnv(headers, serverConfig.envVarKeys);

  // プロセスを取得または起動
  const mcpProcess = await processPool.getOrCreate(serverConfig, env);

  // リクエストを転送
  const response = await mcpProcess.sendRequest(request);

  return response;
};
