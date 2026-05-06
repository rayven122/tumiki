import { redirect } from "next/navigation";

const AdminOrganizationsPage = () => {
  redirect("/admin/directory?tab=organizations");
};

export default AdminOrganizationsPage;
