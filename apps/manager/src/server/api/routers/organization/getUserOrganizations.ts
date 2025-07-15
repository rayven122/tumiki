import { type ProtectedContext } from "@/server/api/trpc";
import { type z } from "zod";
import type { GetUserOrganizationsInput } from ".";

type GetUserOrganizationsProps = {
  ctx: ProtectedContext;
  input?: z.infer<typeof GetUserOrganizationsInput>;
};

export const getUserOrganizations = async ({
  ctx,
}: GetUserOrganizationsProps) => {
  const { db, session } = ctx;
  const userId = session.user.id;

  // ユーザーが所属する組織の一覧を取得
  return await db.organization.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
  });
};
