import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { db } from "@tumiki/internal-db/server";

export const SCIM_PROVIDER = "scim" as const;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/** Bearerトークンを検証してSCIMリクエストを認証する */
export const validateScimAuth = async (req: NextRequest): Promise<boolean> => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  if (!token) return false;

  const stored = await db.scimToken.findUnique({
    where: { hash: hashToken(token) },
  });
  return !!stored;
};
