// サーバーサイド用のエクスポート（暗号化機能を含む）
export { fieldEncryptionMiddleware } from "prisma-field-encryption";

// ローカル環境ではTCP接続、本番環境ではWebSocket接続を使用
const isLocalDatabase = process.env.DATABASE_URL?.includes("localhost");

export const { db } = await (isLocalDatabase
  ? import("./tcpClient.js")
  : import("./wsClient.js"));

export type { Db } from "./wsClient.js";
export * from "@prisma/client";
