import { createTRPCRouter, procedure } from "@/server/api/trpc";
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
  issue: procedure
    .input(issueLicenseInputSchema)
    .mutation(({ ctx, input }) => issueLicense(ctx, input)),
  list: procedure
    .input(listLicensesInputSchema)
    .query(({ ctx, input }) => listLicenses(ctx, input)),
  get: procedure
    .input(getLicenseInputSchema)
    .query(({ ctx, input }) => getLicense(ctx, input)),
  revoke: procedure
    .input(revokeLicenseInputSchema)
    .mutation(({ ctx, input }) => revokeLicense(ctx, input)),
});
