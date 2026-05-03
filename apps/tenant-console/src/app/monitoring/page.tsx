import { TRPCError } from "@trpc/server";
import { api } from "@/trpc/server";
import PodMonitoringTable from "./_components/PodMonitoringTable";

const MonitoringPage = async () => {
  const initialData = await api.monitoring.pods().catch((err: unknown) => {
    if (err instanceof TRPCError && err.code === "UNAUTHORIZED") return null;
    throw err;
  });

  if (!initialData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-red-600">認証が必要です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pod 監視</h1>
          <p className="mt-1 text-sm text-gray-500">
            全テナントの k8s Pod 稼働状況
          </p>
        </div>

        {initialData.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-500">テナントがまだ存在しません</p>
          </div>
        ) : (
          <PodMonitoringTable initialData={initialData} />
        )}
      </div>
    </div>
  );
};

export default MonitoringPage;
