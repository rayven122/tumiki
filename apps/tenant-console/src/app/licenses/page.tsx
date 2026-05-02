import { api } from "@/trpc/server";
import LicenseTable from "./_components/LicenseTable";

const LicensesPage = async () => {
  const [result, tenants] = await Promise.all([
    api.license.list({}),
    api.tenant.list(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <LicenseTable
          initialData={result}
          tenants={tenants.map((t) => ({ id: t.id, slug: t.slug }))}
        />
      </div>
    </div>
  );
};

export default LicensesPage;
