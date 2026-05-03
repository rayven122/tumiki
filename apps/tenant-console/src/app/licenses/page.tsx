import { api } from "@/trpc/server";
import LicenseTable from "./_components/LicenseTable";

const LicensesPage = async () => {
  const [result, tenants] = await Promise.all([
    api.license.list({}),
    api.tenant.list(),
  ]);

  return (
    <div className="p-6">
      <LicenseTable
        initialData={result}
        tenants={tenants.map((t) => ({ id: t.id, slug: t.slug }))}
      />
    </div>
  );
};

export default LicensesPage;
