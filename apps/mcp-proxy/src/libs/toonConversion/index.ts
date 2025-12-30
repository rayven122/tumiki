/**
 * TOON変換モジュール
 * JSON-RPC 2.0レスポンスをTOON形式に変換し、AIへのトークン量を削減する
 */

export {
  convertMcpResponseToToon,
  convertMcpResponseToToonSafe,
} from "./jsonRpcToonConverter.js";
export {
  type JsonRpcErrorResponse,
  type JsonRpcResponse,
  type JsonRpcSuccessResponse,
  type ToonConversionResult,
} from "./types.js";
