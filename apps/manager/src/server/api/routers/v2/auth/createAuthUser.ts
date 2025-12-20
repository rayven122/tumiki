import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";

/**
 * 認証ユーザー作成の入力スキーマ
 */
export const createAuthUserInputSchema = z.object({
  id: z.string(),
  email: z.string().email(), // AdapterUserに合わせて必須
  name: z.string().nullable(),
  image: z.string().url().nullable().optional(),
  emailVerified: z.date().nullable().optional(),
});

export type CreateAuthUserInput = z.infer<typeof createAuthUserInputSchema>;

/**
 * 認証ユーザー作成の出力スキーマ
 * AdapterUser型と互換性を持たせるため、emailは必須
 */
export const createAuthUserOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(), // AdapterUserに合わせて必須
  name: z.string().nullable(),
  image: z.string().url().nullable(),
  emailVerified: z.date().nullable(),
});

export type CreateAuthUserOutput = z.infer<typeof createAuthUserOutputSchema>;

/**
 * 認証ユーザーを作成する
 *
 * NextAuth Adapterのcreateユーザーメソッドから呼び出される
 * idを含めてユーザーを作成する（Keycloak IDを使用）
 *
 * @param tx Prismaトランザクションクライアント
 * @param input ユーザー作成データ
 * @returns 作成されたユーザー情報
 */
export const createAuthUser = async (
  tx: PrismaTransactionClient,
  input: CreateAuthUserInput,
): Promise<CreateAuthUserOutput> => {
  const user = await tx.user.create({
    data: {
      id: input.id,
      email: input.email,
      name: input.name,
      image: input.image ?? null,
      emailVerified: input.emailVerified ?? null,
    },
  });

  // 入力データのemailを使用して型安全性を保つ
  return {
    id: user.id,
    email: input.email, // 入力データは検証済みでstring型
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
  };
};
