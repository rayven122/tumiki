import type { RouterOutputs } from "@/trpc/react";

type LicenseStatus =
  RouterOutputs["license"]["list"]["items"][number]["computedStatus"];

export const licenseStatusBadgeClass = (status: LicenseStatus) => {
  if (status === "ACTIVE") return "bg-badge-success-bg text-badge-success-text";
  if (status === "EXPIRED") return "bg-badge-warn-bg text-badge-warn-text";
  return "bg-badge-error-bg text-badge-error-text";
};
