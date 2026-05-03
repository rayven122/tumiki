import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "~/auth";
import { AdminSidebar } from "./_components/AdminSidebar";

const AdminLayout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();
  if (!session) redirect("/api/auth/signin?callbackUrl=/admin");
  // 管理画面の存在を非管理者へ露出しないため、layout側では404にする。
  if (session.user.role !== "SYSTEM_ADMIN") notFound();

  return (
    <div className="bg-bg-main flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default AdminLayout;
