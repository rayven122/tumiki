import { redirect } from "next/navigation";

const AdminGroupsPage = () => {
  redirect("/admin/directory?tab=groups");
};

export default AdminGroupsPage;
