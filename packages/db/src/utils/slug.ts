import type { PrismaClient } from "@prisma/client";
import { customAlphabet } from "nanoid";

/**
 * URL安全なランダム文字列生成（英数字のみ、6文字）
 */
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 6);

/**
 * 組織名から基本スラッグを生成
 * - 小文字化
 * - 空白をハイフンに変換
 * - 特殊文字を削除
 * - 個人組織の場合は@プレフィックスを追加
 *
 * @param name - 組織名またはユーザー名
 * @param isPersonal - 個人組織かどうか
 * @returns 正規化されたスラッグ
 */
export const generateBaseSlug = (name: string, isPersonal = false): string => {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // 空白をハイフンに
    .replace(/[^a-z0-9\-_]/g, "") // 許可文字以外を削除
    .replace(/-+/g, "-") // 連続ハイフンを1つに
    .replace(/^-+|-+$/g, ""); // 先頭・末尾のハイフンを削除

  // 空文字列になった場合（日本語名など）、ランダム文字列を使用
  const baseSlug = normalized || `user-${nanoid()}`;

  return isPersonal ? `@${baseSlug}` : baseSlug;
};

/**
 * ユニークなスラッグを生成（重複時はランダムサフィックス付与）
 *
 * @param db - Prismaクライアントインスタンス
 * @param baseName - 基本となる名前
 * @param isPersonal - 個人組織かどうか
 * @returns ユニークなスラッグ
 * @throws 10回の試行後もユニークなスラッグが生成できない場合
 */
export const generateUniqueSlug = async (
  db: PrismaClient,
  baseName: string,
  isPersonal = false,
): Promise<string> => {
  const baseSlug = generateBaseSlug(baseName, isPersonal);
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

    // 重複時: ランダムサフィックスを追加
    slug = `${baseSlug}-${nanoid()}`;
    attempts++;
  }

  throw new Error("Failed to generate unique slug after multiple attempts");
};

/**
 * カスタムスラッグの検証と利用可能性チェック
 *
 * @param db - Prismaクライアントインスタンス
 * @param slug - 検証するスラッグ
 * @returns 検証結果オブジェクト
 */
export const validateCustomSlug = async (
  db: PrismaClient,
  slug: string,
): Promise<{ valid: boolean; available: boolean; error?: string }> => {
  // フォーマット検証
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

  // 連続ハイフンチェック
  if (slug.includes("--")) {
    return {
      valid: false,
      available: false,
      error: "連続したハイフンは使用できません",
    };
  }

  // 重複チェック
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
