import { notFound } from "next/navigation";
import Link from "next/link";
import { TRPCError } from "@trpc/server";
import { api } from "@/trpc/server";
import TenantDetailTabs from "./_components/TenantDetailTabs";

type Props = {
  params: Promise<{ id: string }>;
};

const TenantDetailPage = async ({ params }: Props) => {
  const { id } = await params;

  const [tenant, licenses] = await Promise.all([
    api.tenant.get({ id }).catch((err: unknown) => {
      if (err instanceof TRPCError && err.code === "NOT_FOUND") return null;
      throw err;
    }),
    api.license.list({ tenantId: id }),
  ]);

  if (!tenant) notFound();

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/tenants"
          className="text-text-muted hover:bg-bg-active hover:text-text-primary rounded-lg px-2 py-1 text-xs transition-colors"
        >
          ← テナント一覧
        </Link>
        <div>
          <h1 className="text-text-primary text-lg font-semibold">
            {tenant.slug}
          </h1>
          <p className="text-text-secondary mt-1 text-xs">{tenant.domain}</p>
        </div>
      </div>

      <TenantDetailTabs tenant={tenant} initialLicenses={licenses} />
    </div>
  );
};

export default TenantDetailPage;
