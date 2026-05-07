import { TRPCError } from "@trpc/server";
import { api } from "@/trpc/server";
import TenantOperationsTable from "./_components/TenantOperationsTable";

const TenantsPage = async () => {
  const [tenants, podRows] = await Promise.all([
    api.tenant.list(),
    api.monitoring.pods().catch((err: unknown) => {
      if (err instanceof TRPCError && err.code === "UNAUTHORIZED") return null;
      throw err;
    }),
  ]);

  return <TenantOperationsTable tenants={tenants} initialPodRows={podRows} />;
};

export default TenantsPage;
