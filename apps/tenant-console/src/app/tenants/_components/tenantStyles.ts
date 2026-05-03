import type { RouterOutputs } from "@/trpc/react";

type TenantStatus = RouterOutputs["tenant"]["list"][number]["status"];

export const tenantStatusBadgeClass = (status: TenantStatus) => {
  if (status === "ACTIVE") return "bg-badge-success-bg text-badge-success-text";
  if (status === "ERROR") return "bg-badge-error-bg text-badge-error-text";
  if (status === "DELETING" || status === "UPGRADING")
    return "bg-badge-warn-bg text-badge-warn-text";
  return "bg-bg-active text-text-muted";
};
