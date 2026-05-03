import { Role, type PrismaTransactionClient } from "@tumiki/internal-db";
import { z } from "zod";

/**
 * ユーザー作成の入力スキーマ
 */
export const createUserInputSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
  emailVerified: z.date().nullable().optional(),
  image: z.string().nullable().optional(),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

/**
 * ユーザー作成の出力スキーマ
 */
export const createUserOutputSchema = z.object({
  id: z.string(),
  email: z.string(),
  emailVerified: z.date().nullable(),
  role: z.nativeEnum(Role),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

export type CreateUserOutput = z.infer<typeof createUserOutputSchema>;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isBootstrapAdminEmail = (email: string): boolean => {
  const bootstrapAdminEmail =
    process.env.INTERNAL_MANAGER_BOOTSTRAP_ADMIN_EMAIL;

  return (
    typeof bootstrapAdminEmail === "string" &&
    normalizeEmail(bootstrapAdminEmail) === normalizeEmail(email)
  );
};

/**
 * ユーザーを作成（Registry用簡素版）
 *
 * Registryでは個人組織を作成しない
 */
export const createUser = async (
  tx: PrismaTransactionClient,
  input: CreateUserInput,
): Promise<CreateUserOutput> => {
  // 初回セットアップは1ユーザー限定の単一フロー前提（同時サインアップ非対応）。
  const existingUserCount = await tx.user.count();
  const role =
    existingUserCount === 0 || isBootstrapAdminEmail(input.email)
      ? Role.SYSTEM_ADMIN
      : Role.USER;

  const createdUser = await tx.user.create({
    data: {
      id: input.id,
      name: input.name,
      email: input.email,
      emailVerified: input.emailVerified ?? null,
      image: input.image ?? null,
      role,
    },
  });

  if (!createdUser.email) {
    throw new Error(
      "ユーザーは作成されましたが、データベースのメールアドレスがnullです。これは発生してはいけません。",
    );
  }

  return {
    id: createdUser.id,
    email: createdUser.email,
    emailVerified: createdUser.emailVerified,
    role: createdUser.role,
    name: createdUser.name,
    image: createdUser.image,
  };
};
