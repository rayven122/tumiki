import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterUser, AdapterAccount } from "@auth/core/adapters";
import { db } from "@tumiki/db/server";
import { createAuthUser } from "~/server/api/routers/v2/auth/createAuthUser";
import { handleAccountLink } from "~/server/api/routers/v2/auth/handleAccountLink";

/**
 * カスタマイズされたPrisma Adapter
 */
export const createCustomAdapter = () => {
  const baseAdapter = PrismaAdapter(db);

  return {
    ...baseAdapter,

    /**
     * ユーザー作成
     * Keycloak IDを含めてユーザーを作成
     */
    async createUser(data: AdapterUser): Promise<AdapterUser> {
      const user = await db.$transaction(async (tx) => {
        return await createAuthUser(tx, {
          id: data.id,
          email: data.email, // AdapterUserではemailは必須
          name: data.name ?? null,
          image: data.image ?? null,
          emailVerified: data.emailVerified ?? null,
        });
      });

      // AdapterUser型に合わせて明示的に変換
      return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
      };
    },

    /**
     * アカウントリンク
     * Keycloakアカウントリンク後に個人組織を自動作成
     */
    async linkAccount(
      account: AdapterAccount,
    ): Promise<AdapterAccount | null | undefined> {
      return await db.$transaction(async (tx) => {
        // 標準のlinkAccountを実行
        const result = await baseAdapter.linkAccount!(account);
        if (result === undefined) {
          return undefined;
        }

        // アカウントリンク後の処理を実行
        await handleAccountLink(tx, {
          userId: account.userId,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        });

        return result ?? undefined;
      });
    },
  };
};
