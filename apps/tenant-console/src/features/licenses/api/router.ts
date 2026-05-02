import {
  createTRPCRouter,
  operatorProcedure,
  procedure,
} from "@/server/api/trpc";
import {
  issueLicenseInputSchema,
  listLicensesInputSchema,
  getLicenseInputSchema,
  revokeLicenseInputSchema,
} from "./schemas";
import { issueLicense } from "./issueLicense";
import { listLicenses } from "./listLicenses";
import { getLicense } from "./getLicense";
import { revokeLicense } from "./revokeLicense";

export const licenseRouter = createTRPCRouter({
  // issue / revoke は CF-Access ヘッダーを必須とするオペレーター専用操作
  issue: operatorProcedure
    .input(issueLicenseInputSchema)
    .mutation(({ ctx, input }) => issueLicense(ctx, input)),
  list: procedure
    .input(listLicensesInputSchema)
    .query(({ ctx, input }) => listLicenses(ctx, input)),
  get: procedure
    .input(getLicenseInputSchema)
    .query(({ ctx, input }) => getLicense(ctx, input)),
  revoke: operatorProcedure
    .input(revokeLicenseInputSchema)
    .mutation(({ ctx, input }) => revokeLicense(ctx, input)),
});
