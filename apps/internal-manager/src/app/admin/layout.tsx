import type { ReactNode } from "react";
import { AdminSidebar } from "./_components/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: "var(--bg-main)" }}
    >
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
