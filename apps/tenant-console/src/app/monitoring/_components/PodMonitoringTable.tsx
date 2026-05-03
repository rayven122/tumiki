"use client";

import { useCallback } from "react";
import { api, type RouterOutputs } from "@/trpc/react";

type TenantPodRow = RouterOutputs["monitoring"]["pods"][number];

const phaseColor = (phase: string, ready: boolean) => {
  if (phase === "Running" && ready) return "bg-green-100 text-green-800";
  if (phase === "Running" && !ready) return "bg-yellow-100 text-yellow-800";
  if (phase === "Pending") return "bg-yellow-100 text-yellow-800";
  if (phase === "Failed") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
};

const dbStatusColor = (status: string) => {
  if (status === "ACTIVE") return "bg-green-100 text-green-800";
  if (status === "ERROR") return "bg-red-100 text-red-800";
  if (status === "DELETING") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
};

const formatAge = (date: Date | null) => {
  if (!date) return "-";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
};

const TenantSection = ({ row }: { row: TenantPodRow }) => (
  <div className="overflow-hidden rounded-lg bg-white shadow">
    <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold text-gray-900">
          {row.slug}
        </span>
        <span
          className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${dbStatusColor(row.dbStatus)}`}
        >
          {row.dbStatus}
        </span>
      </div>
      {row.error && <span className="text-xs text-red-600">{row.error}</span>}
    </div>

    {row.pods.length === 0 ? (
      <p className="px-4 py-3 text-sm text-gray-400">
        {row.dbStatus === "ACTIVE" ? "Pod なし" : "監視対象外"}
      </p>
    ) : (
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Pod名
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              ステータス
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              Ready
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              再起動
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              起動時間
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {row.pods.map((pod) => (
            <tr key={pod.name}>
              <td className="px-4 py-3 font-mono text-xs text-gray-900">
                {pod.name}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${phaseColor(pod.phase, pod.ready)}`}
                >
                  {pod.phase}
                  {pod.containers.some((c) => c.waitingReason) &&
                    ` (${pod.containers.find((c) => c.waitingReason)?.waitingReason})`}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {pod.ready ? "✓" : "✗"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {pod.restartCount > 0 ? (
                  <span className="font-medium text-red-600">
                    {pod.restartCount}
                  </span>
                ) : (
                  pod.restartCount
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {formatAge(pod.startedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const PodMonitoringTable = ({
  initialData,
}: {
  initialData: RouterOutputs["monitoring"]["pods"];
}) => {
  const { data, refetch, isFetching } = api.monitoring.pods.useQuery(
    undefined,
    {
      initialData,
      refetchInterval: 30_000,
    },
  );

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">30秒ごとに自動更新</p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isFetching}
          className="min-h-[44px] rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isFetching ? "更新中..." : "今すぐ更新"}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {data.map((row) => (
          <TenantSection key={row.tenantId} row={row} />
        ))}
      </div>
    </div>
  );
};

export default PodMonitoringTable;
