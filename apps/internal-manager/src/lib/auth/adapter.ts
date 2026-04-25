import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterUser } from "@auth/core/adapters";
import { db } from "@tumiki/internal-db/server";
import { createUser } from "./create-user";

export const createCustomAdapter = () => {
  const baseAdapter = PrismaAdapter(db);

  return {
    ...baseAdapter,

    createUser: async (data: AdapterUser): Promise<AdapterUser> => {
      if (!data.id) {
        throw new Error("OIDC sub is required");
      }

      const user = await db.$transaction(async (tx) => {
        return await createUser(tx, {
          id: data.id,
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
