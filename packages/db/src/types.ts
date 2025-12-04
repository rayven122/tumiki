import type { Db } from "./index.js";

export {
  PermissionAction,
  ResourceType,
  McpServerVisibility,
  TransportType,
} from "@prisma/client";

/**
 * トランザクション内で使用可能なPrismaクライアント型
 * $transaction, $connect, $disconnect等のメソッドを除外
 */
export type PrismaTransactionClient = Omit<
  Db,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
