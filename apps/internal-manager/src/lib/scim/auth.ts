import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { db } from "@tumiki/internal-db/server";

export const SCIM_PROVIDER = "scim" as const;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/**
 * Bearerトークンを検証してSCIMリクエストを認証する
 * DBのScimTokenを優先し、未設定時はSCIM_TOKEN環境変数にフォールバック
 */
export const validateScimAuth = async (req: NextRequest): Promise<boolean> => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  if (!token) return false;

  const hash = hashToken(token);

  // DBに登録済みのトークンと照合
  const stored = await db.scimToken.findUnique({ where: { hash } });
  if (stored) return true;

  // フォールバック: SCIM_TOKEN環境変数（後方互換）
  const envToken = process.env.SCIM_TOKEN;
  return !!envToken && token === envToken;
};
