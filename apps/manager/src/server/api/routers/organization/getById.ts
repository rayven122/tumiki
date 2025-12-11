import { z } from "zod";
import type { ProtectedContext } from "@/server/api/trpc";
import { validateOrganizationAccess } from "@/server/utils/organizationPermissions";
import { getOrganizationWithFullDetails } from "@/server/utils/organizationQueries";
import { fullOrganizationOutput } from "@/server/utils/organizationSchemas";

export const getOrganizationByIdInputSchema = z.object({});
export const getOrganizationByIdOutputSchema = fullOrganizationOutput;

export type GetOrganizationByIdInput = z.infer<
  typeof getOrganizationByIdInputSchema
>;
export type GetOrganizationByIdOutput = z.infer<typeof fullOrganizationOutput>;

export const getOrganizationById = async ({
  ctx,
}: {
  ctx: ProtectedContext;
}): Promise<GetOrganizationByIdOutput> => {
  // 権限を検証
  validateOrganizationAccess(ctx.currentOrg);

  // 完全な組織詳細を取得
  const organization = await getOrganizationWithFullDetails(
    ctx.db,
    ctx.currentOrg.id,
  );

  if (!organization) {
    throw new Error("Organization not found");
  }

  // この時点で organization は存在することが保証されている
  return organization;
};
