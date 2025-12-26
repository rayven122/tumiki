import type { PrismaClient } from "@prisma/client";
import { customAlphabet } from "nanoid";

import type { PrismaTransactionClient } from "../types.js";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 6);

/**
 * 文字列をslug形式に正規化（小文字化、空白→ハイフン、許可文字以外削除）
 */
const normalizeToSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export type SlugType = "org" | "personalOrg" | "role";

const SLUG_TYPE_CONFIGS: Record<
  SlugType,
  { prefix: string; fallbackPrefix: string }
> = {
  org: { prefix: "", fallbackPrefix: "org" },
  personalOrg: { prefix: "@", fallbackPrefix: "user" },
  role: { prefix: "", fallbackPrefix: "role" },
};

/** 文字列をslug形式に正規化 */
export const normalizeSlug = normalizeToSlug;

/** 名前から基本スラッグを生成 */
export const generateBaseSlug = (name: string, type: SlugType): string => {
  const config = SLUG_TYPE_CONFIGS[type];
  const normalized = normalizeToSlug(name);
  const baseSlug = normalized || `${config.fallbackPrefix}-${nanoid()}`;
  return `${config.prefix}${baseSlug}`;
};

/** ユニークなスラッグを生成（重複時はランダムサフィックス付与） */
export const generateUniqueSlug = async (
  db: PrismaTransactionClient,
  baseName: string,
  type: SlugType,
): Promise<string> => {
  const baseSlug = generateBaseSlug(baseName, type);
  let slug = baseSlug;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await db.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${nanoid()}`;
    attempts++;
  }

  throw new Error("Failed to generate unique slug after multiple attempts");
};

/** カスタムスラッグの検証と利用可能性チェック */
export const validateCustomSlug = async (
  db: PrismaClient,
  slug: string,
): Promise<{ valid: boolean; available: boolean; error?: string }> => {
  const slugRegex = /^@?[a-z0-9][a-z0-9\-_]*$/;
  if (!slugRegex.test(slug)) {
    return {
      valid: false,
      available: false,
      error: "英数字、ハイフン、アンダースコアのみ使用可能です",
    };
  }

  if (slug.length < 3 || slug.length > 50) {
    return {
      valid: false,
      available: false,
      error: "スラッグは3-50文字である必要があります",
    };
  }

  if (slug.includes("--")) {
    return {
      valid: false,
      available: false,
      error: "連続したハイフンは使用できません",
    };
  }

  const existing = await db.organization.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing) {
    return {
      valid: true,
      available: false,
      error: "このスラッグは既に使用されています",
    };
  }

  return { valid: true, available: true };
};
