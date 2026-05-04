import type { McpCatalog } from "@prisma/desktop-client";
import { z } from "zod";
import type { CatalogItem } from "../../../types/catalog";

const jsonStringArraySchema = z
  .string()
  .transform((s, ctx) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "不正なJSON文字列です",
      });
      return z.NEVER;
    }
  })
  .pipe(z.array(z.string()));

/** 個人利用モードでは権限・ステータスの概念がないため、すべて利用可能として扱う */
export const toCatalogItem = (local: McpCatalog): CatalogItem => {
  const args = jsonStringArraySchema.parse(local.args);
  const credentialKeys = jsonStringArraySchema.parse(local.credentialKeys);

  return {
    id: String(local.id),
    name: local.name,
    description: local.description,
    iconUrl: local.iconPath,
    status: "available",
    permissions: { read: true, write: true, execute: true },
    transportType: local.transportType,
    authType: local.authType,
    requiredCredentialKeys: credentialKeys,
    tools: [],
    connectionTemplate: {
      transportType: local.transportType,
      command: local.command,
      args,
      url: local.url,
      authType: local.authType,
      credentialKeys,
    },
  };
};
