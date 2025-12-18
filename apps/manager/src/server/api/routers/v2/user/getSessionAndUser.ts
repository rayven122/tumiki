import type { PrismaTransactionClient } from "@tumiki/db";
import { z } from "zod";

/**
 * セッションとユーザー取得の入力スキーマ
 */
export const getSessionAndUserInputSchema = z.object({
  sessionToken: z.string(),
});

export type GetSessionAndUserInput = z.infer<
  typeof getSessionAndUserInputSchema
>;

/**
 * セッションとユーザー取得の出力スキーマ
 * AdapterSessionとAdapterUserに準拠
 */
export const getSessionAndUserOutputSchema = z
  .object({
    session: z.object({
      sessionToken: z.string(),
      userId: z.string(),
      expires: z.date(),
    }),
    user: z.object({
      id: z.string(),
      email: z.string(),
      emailVerified: z.date().nullable(),
      name: z.string().nullable(),
      image: z.string().nullable(),
      role: z.enum(["SYSTEM_ADMIN", "USER"]),
    }),
  })
  .nullable();

export type GetSessionAndUserOutput = z.infer<
  typeof getSessionAndUserOutputSchema
>;

/**
 * セッショントークンからセッションとユーザー情報を取得
 *
 * PrismaAdapterのgetSessionAndUserで使用
 * セッション取得時に組織情報も一緒に取得してパフォーマンス最適化
 */
export const getSessionAndUser = async (
  tx: PrismaTransactionClient,
  input: GetSessionAndUserInput,
): Promise<GetSessionAndUserOutput> => {
  const userAndSession = await tx.session.findUnique({
    where: { sessionToken: input.sessionToken },
    include: {
      user: true,
    },
  });

  if (!userAndSession) return null;

  const { user, ...session } = userAndSession;

  // emailがnullの場合はエラー（AdapterUserはemailが必須）
  if (!user.email) {
    throw new Error(`User email is null for user: ${user.id}`);
  }

  return {
    session: {
      sessionToken: session.sessionToken,
      userId: session.userId,
      expires: session.expires,
    },
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      image: user.image,
      role: user.role,
    },
  };
};
