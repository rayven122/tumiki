import type { ReactNode } from "react";
import { AdminSidebar } from "./_components/AdminSidebar";

const AdminLayout = ({ children }: { children: ReactNode }) => (
  <div className="bg-bg-main flex h-screen">
    <AdminSidebar />
    <main className="flex-1 overflow-y-auto">{children}</main>
  </div>
);

export default AdminLayout;
