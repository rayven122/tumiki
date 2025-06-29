import "server-only";

import crypto from "crypto";

const API_KEY_PREFIX = process.env.API_KEY_PREFIX ?? "mcp_live_";
const API_KEY_LENGTH = parseInt(process.env.API_KEY_LENGTH ?? "32");

export const generateApiKey = () => {
  const rawKey = crypto.randomBytes(API_KEY_LENGTH).toString("base64url");
  const fullKey = `${API_KEY_PREFIX}${rawKey}`;
  return fullKey;
};
