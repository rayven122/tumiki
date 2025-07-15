import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { getOrganizationWithFullDetails } from "@/server/utils/organizationQueries";
import {
  baseOrganizationIdInput,
  fullOrganizationOutput,
} from "@/server/utils/organizationSchemas";

export const getOrganizationByIdInputSchema = baseOrganizationIdInput;
export const getOrganizationByIdOutputSchema = fullOrganizationOutput;

export type GetOrganizationByIdInput = z.infer<typeof baseOrganizationIdInput>;
export type GetOrganizationByIdOutput = z.infer<typeof fullOrganizationOutput>;

export const getOrganizationById = async ({
  input,
  ctx,
}: {
  input: GetOrganizationByIdInput;
  ctx: ProtectedContext;
}): Promise<GetOrganizationByIdOutput> => {
  // 権限を検証
  await validateOrganizationAccess(ctx.db, input.id, ctx.session.user.id);

  // 完全な組織詳細を取得
  const organization = await getOrganizationWithFullDetails(ctx.db, input.id);

  // この時点で organization は存在することが保証されている
  return organization!;
};
