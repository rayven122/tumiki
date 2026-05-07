import type { RouterOutputs } from "@/trpc/react";

type Tenant = RouterOutputs["tenant"]["list"][number];
type PodRows = RouterOutputs["monitoring"]["pods"];
type PodRow = PodRows[number];
type HealthTone = "success" | "warn" | "error" | "muted";

export const phaseBadgeClass = (phase: string, ready: boolean) => {
  if (phase === "Running" && ready)
    return "bg-badge-success-bg text-badge-success-text";
  if (phase === "Running" || phase === "Pending")
    return "bg-badge-warn-bg text-badge-warn-text";
  if (phase === "Failed") return "bg-badge-error-bg text-badge-error-text";
  return "bg-bg-active text-text-muted";
};

export const formatAge = (date: Date | null) => {
  if (!date) return "-";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
};

export const podHealthLabel = (tenant: Tenant, row: PodRow | undefined) => {
  if (!row) return { label: "未取得", tone: "muted" as const };
  if (row.error) return { label: "取得失敗", tone: "error" as const };
  if (tenant.status !== "ACTIVE")
    return { label: "監視対象外", tone: "muted" as const };
  if (row.pods.length === 0)
    return { label: "Pod なし", tone: "warn" as const };
  if (row.pods.every((pod) => pod.phase === "Running" && pod.ready))
    return { label: "Healthy", tone: "success" as const };
  return { label: "Attention", tone: "warn" as const };
};

export const healthClass = (tone: HealthTone) => {
  if (tone === "success") return "bg-badge-success-bg text-badge-success-text";
  if (tone === "warn") return "bg-badge-warn-bg text-badge-warn-text";
  if (tone === "error") return "bg-badge-error-bg text-badge-error-text";
  return "bg-bg-active text-text-muted";
};
