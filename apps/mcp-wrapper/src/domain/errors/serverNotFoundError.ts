import { DomainError } from "./domainError.js";

/**
 * MCPサーバーが見つからないエラー
 */
export class ServerNotFoundError extends DomainError {
  readonly code = "SERVER_NOT_FOUND";

  constructor(serverName: string) {
    super(`MCP server not found: ${serverName}`);
  }
}
