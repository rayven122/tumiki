import type { NextRequest } from "next/server";

export const SCIM_PROVIDER = "scim" as const;

const getScimToken = (): string => {
  const token = process.env.SCIM_TOKEN;
  if (!token) throw new Error("SCIM_TOKEN is not configured");
  return token;
};

/** Bearerトークンを検証してSCIMリクエストを認証する */
export const validateScimAuth = (req: NextRequest): boolean => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  try {
    return token === getScimToken();
  } catch {
    return false;
  }
};
