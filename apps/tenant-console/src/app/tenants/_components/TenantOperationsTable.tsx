"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { api, type RouterOutputs } from "@/trpc/react";
import { tenantStatusBadgeClass } from "./tenantStyles";

type Tenant = RouterOutputs["tenant"]["list"][number];
type PodRows = RouterOutputs["monitoring"]["pods"];
type PodRow = PodRows[number];

type Props = {
  tenants: Tenant[];
  initialPodRows: PodRows | null;
};

const phaseBadgeClass = (phase: string, ready: boolean) => {
  if (phase === "Running" && ready)
    return "bg-badge-success-bg text-badge-success-text";
  if (phase === "Running" || phase === "Pending")
    return "bg-badge-warn-bg text-badge-warn-text";
  if (phase === "Failed") return "bg-badge-error-bg text-badge-error-text";
  return "bg-bg-active text-text-muted";
};

const formatAge = (date: Date | null) => {
  if (!date) return "-";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
};

const podHealthLabel = (tenant: Tenant, row: PodRow | undefined) => {
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

const healthClass = (tone: "success" | "warn" | "error" | "muted") => {
  if (tone === "success") return "bg-badge-success-bg text-badge-success-text";
  if (tone === "warn") return "bg-badge-warn-bg text-badge-warn-text";
  if (tone === "error") return "bg-badge-error-bg text-badge-error-text";
  return "bg-bg-active text-text-muted";
};

const TenantOperationsTable = ({ tenants, initialPodRows }: Props) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const podQuery = api.monitoring.pods.useQuery(undefined, {
    initialData: initialPodRows ?? undefined,
    enabled: initialPodRows !== null,
    refetchInterval: 30_000,
  });

  const podRows = podQuery.data ?? initialPodRows ?? [];
  const podByTenantId = useMemo(
    () => new Map(podRows.map((row) => [row.tenantId, row])),
    [podRows],
  );

  const stats = useMemo(() => {
    const activeTenants = tenants.filter(
      (tenant) => tenant.status === "ACTIVE",
    ).length;
    const restartCount = podRows.reduce(
      (sum, row) =>
        sum + row.pods.reduce((inner, pod) => inner + pod.restartCount, 0),
      0,
    );
    const unhealthyPods = podRows.reduce(
      (sum, row) =>
        sum +
        row.pods.filter((pod) => pod.phase !== "Running" || !pod.ready).length,
      0,
    );
    return { activeTenants, restartCount, unhealthyPods };
  }, [podRows, tenants]);

  const refreshPods = () => {
    void podQuery.refetch();
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-text-primary text-lg font-semibold">
            テナント運用
          </h1>
          <p className="text-text-secondary mt-1 text-xs">
            テナント状態と k8s Pod 稼働状況を同じ画面で確認します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshPods}
            disabled={podQuery.isFetching || initialPodRows === null}
            className="border-border-default text-text-secondary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            <RefreshCw
              size={13}
              className={podQuery.isFetching ? "animate-spin" : ""}
            />
            {podQuery.isFetching ? "更新中" : "Pod 更新"}
          </button>
          <Link
            href="/tenants/new"
            className="bg-btn-primary-bg text-btn-primary-text flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          >
            <Plus size={13} />
            新規テナント
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "テナント", value: tenants.length, sub: "total" },
          { label: "Active", value: stats.activeTenants, sub: "db status" },
          { label: "Pod 異常", value: stats.unhealthyPods, sub: "not ready" },
          { label: "再起動", value: stats.restartCount, sub: "total restarts" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-bg-card border-border-default rounded-xl border p-4"
          >
            <span className="text-text-muted text-xs">{card.label}</span>
            <div className="text-text-primary mt-2 text-2xl font-semibold">
              {card.value}
            </div>
            <div className="text-text-subtle mt-0.5 text-[10px]">
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {initialPodRows === null && (
        <div className="border-border-default bg-bg-card text-badge-warn-text flex items-center gap-2 rounded-xl border px-4 py-3 text-xs">
          <AlertTriangle size={14} />
          Pod 監視情報の取得には認証が必要です。テナント情報のみ表示しています。
        </div>
      )}

      {tenants.length === 0 ? (
        <div className="bg-bg-card border-border-default rounded-xl border py-14 text-center">
          <p className="text-text-muted text-sm">テナントがまだ存在しません</p>
        </div>
      ) : (
        <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <div className="border-b-border-default text-text-subtle grid min-w-[980px] grid-cols-[32px_1.1fr_1.4fr_92px_86px_112px_80px_112px_64px] items-center gap-3 border-b px-5 py-2.5 text-[10px]">
              <span />
              <span>Slug</span>
              <span>ドメイン</span>
              <span>ステータス</span>
              <span>OIDC</span>
              <span>Pod health</span>
              <span className="text-right">再起動</span>
              <span>作成日時</span>
              <span className="text-right">操作</span>
            </div>
            {tenants.map((tenant) => {
              const row = podByTenantId.get(tenant.id);
              const health = podHealthLabel(tenant, row);
              const restarts =
                row?.pods.reduce((sum, pod) => sum + pod.restartCount, 0) ?? 0;
              const isExpanded = expanded === tenant.id;
              return (
                <div key={tenant.id}>
                  <div className="border-b-border-subtle hover:bg-bg-card-hover grid min-w-[980px] grid-cols-[32px_1.1fr_1.4fr_92px_86px_112px_80px_112px_64px] items-center gap-3 border-b px-5 py-3 text-left text-xs transition-colors">
                    <button
                      type="button"
                      aria-label={`${tenant.slug} の Pod 詳細を${isExpanded ? "閉じる" : "開く"}`}
                      onClick={() => setExpanded(isExpanded ? null : tenant.id)}
                      className="text-text-muted hover:bg-bg-active hover:text-text-primary rounded p-1 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                    <span className="text-text-primary font-mono font-medium">
                      {tenant.slug}
                    </span>
                    <span className="text-text-secondary truncate">
                      {tenant.domain}
                    </span>
                    <span
                      className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${tenantStatusBadgeClass(tenant.status)}`}
                    >
                      {tenant.status}
                    </span>
                    <span className="text-text-muted font-mono text-[11px]">
                      {tenant.oidcType}
                    </span>
                    <span
                      className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${healthClass(health.tone)}`}
                    >
                      {health.label}
                    </span>
                    <span
                      className={`text-right font-mono ${restarts > 0 ? "text-badge-error-text" : "text-text-secondary"}`}
                    >
                      {restarts}
                    </span>
                    <span className="text-text-muted font-mono text-[11px]">
                      {tenant.createdAt.toLocaleDateString("ja-JP")}
                    </span>
                    <span className="text-right">
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="text-text-secondary hover:bg-bg-active hover:text-text-primary rounded px-2 py-1 text-[11px] transition-colors"
                      >
                        詳細
                      </Link>
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="border-b-border-subtle bg-bg-input border-b px-5 py-4">
                      {!row ? (
                        <p className="text-text-muted text-xs">
                          Pod 情報はまだ取得されていません。
                        </p>
                      ) : row.error ? (
                        <p className="text-badge-error-text text-xs">
                          {row.error}
                        </p>
                      ) : row.pods.length === 0 ? (
                        <p className="text-text-muted text-xs">
                          {tenant.status === "ACTIVE"
                            ? "Pod なし"
                            : "このステータスのテナントは監視対象外です"}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-text-subtle grid grid-cols-[1.5fr_108px_72px_72px_1fr_72px] gap-3 px-2 text-[10px]">
                            <span>Pod名</span>
                            <span>ステータス</span>
                            <span>Ready</span>
                            <span className="text-right">再起動</span>
                            <span>Reason</span>
                            <span className="text-right">Age</span>
                          </div>
                          {row.pods.map((pod) => {
                            const reason =
                              pod.containers.find(
                                (container) => container.waitingReason,
                              )?.waitingReason ?? "-";
                            return (
                              <div
                                key={pod.name}
                                className="bg-bg-card-hover grid grid-cols-[1.5fr_108px_72px_72px_1fr_72px] items-center gap-3 rounded-lg px-2 py-2 text-xs"
                              >
                                <span className="text-text-primary truncate font-mono">
                                  {pod.name}
                                </span>
                                <span
                                  className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${phaseBadgeClass(pod.phase, pod.ready)}`}
                                >
                                  {pod.phase}
                                </span>
                                <span className="text-text-secondary">
                                  {pod.ready ? "Ready" : "Not ready"}
                                </span>
                                <span
                                  className={`text-right font-mono ${pod.restartCount > 0 ? "text-badge-error-text" : "text-text-secondary"}`}
                                >
                                  {pod.restartCount}
                                </span>
                                <span className="text-text-muted truncate">
                                  {reason}
                                </span>
                                <span className="text-text-muted text-right font-mono">
                                  {formatAge(pod.startedAt)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-text-subtle flex items-center gap-1.5 text-[10px]">
        <Activity size={11} />
        Pod 状態は 30 秒ごとに自動更新されます。
      </p>
    </div>
  );
};

export default TenantOperationsTable;
