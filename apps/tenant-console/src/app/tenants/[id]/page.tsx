import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/server";
import TenantDetailTabs from "./_components/TenantDetailTabs";

type Props = {
  params: Promise<{ id: string }>;
};

const TenantDetailPage = async ({ params }: Props) => {
  const { id } = await params;

  const [tenant, licenses] = await Promise.all([
    api.tenant.get({ id }).catch(() => null),
    api.license.list({ tenantId: id }),
  ]);

  if (!tenant) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/tenants"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← テナント一覧
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.slug}</h1>
        </div>

        <TenantDetailTabs tenant={tenant} initialLicenses={licenses} />
      </div>
    </div>
  );
};

export default TenantDetailPage;
