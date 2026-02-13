import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterUser } from "@auth/core/adapters";
import { db } from "@tumiki/db/server";
// 循環依存を回避: trpc.ts → ~/auth → adapter.ts → @/features/user → userRouter → trpc.ts
import { createUserWithOrganization } from "@/features/user/api/createUserWithOrganization";

/**
 * Keycloak profileSubフィールドを含む拡張AdapterUser型
 */
type AdapterUserWithProfileSub = AdapterUser & {
  profileSub?: string;
};

/**
 * カスタマイズされたPrisma Adapter
 */
export const createCustomAdapter = () => {
  const baseAdapter = PrismaAdapter(db);

  return {
    ...baseAdapter,

    /**
     * ユーザー作成と個人組織作成
     * profileSubカスタムフィールドを使用してKeycloak subを直接User.idとして使用
     * 同時に個人組織も作成
     */
    async createUser(data: AdapterUserWithProfileSub): Promise<AdapterUser> {
      // profileSubカスタムフィールドからKeycloak subを取得
      const profileSub = data.profileSub;

      if (!profileSub) {
        throw new Error("Keycloak sub is required");
      }

      const user = await db.$transaction(async (tx) => {
        return await createUserWithOrganization(tx, {
          id: profileSub, // Keycloak subを直接User.idとして使用
          email: data.email,
          name: data.name ?? null,
          image: data.image ?? null,
          emailVerified: data.emailVerified ?? null,
        });
      });

      return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
      };
    },
  };
};
