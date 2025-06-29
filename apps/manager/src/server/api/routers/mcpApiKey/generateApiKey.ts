import "server-only";

import crypto from "crypto";
import z from "zod";

const API_KEY_PREFIX = z.string().parse(process.env.API_KEY_PREFIX);
const API_KEY_LENGTH = parseInt(process.env.API_KEY_LENGTH ?? "32");

export const generateApiKey = () => {
  const rawKey = crypto.randomBytes(API_KEY_LENGTH).toString("base64url");
  const fullKey = `${API_KEY_PREFIX}${rawKey}`;
  return fullKey;
};
