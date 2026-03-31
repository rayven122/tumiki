import type { PrismaClient } from "../../../prisma/generated/client";

/**
 * 最新の認証トークンを取得（作成日時の降順で最初の1件）
 */
export const findLatest = async (db: PrismaClient) => {
  return db.authToken.findFirst({
    orderBy: { createdAt: "desc" },
  });
};

/**
 * 認証トークンを作成
 */
export const create = async (
  db: PrismaClient,
  data: { accessToken: string; refreshToken: string; expiresAt: Date },
) => {
  return db.authToken.create({ data });
};

/**
 * 指定IDの認証トークンを削除
 */
export const deleteById = async (db: PrismaClient, id: number) => {
  return db.authToken.delete({ where: { id } });
};

/**
 * すべての認証トークンを削除
 */
export const deleteAll = async (db: PrismaClient) => {
  return db.authToken.deleteMany({});
};

/**
 * 指定ID以外のすべての認証トークンを削除
 */
export const deleteAllExcept = async (db: PrismaClient, id: number) => {
  return db.authToken.deleteMany({
    where: { id: { not: id } },
  });
};
