import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Role } from "@tumiki/internal-db";
import { auth } from "~/auth";
import { AdminSidebar } from "./_components/AdminSidebar";

const AdminLayout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();
  if (!session) redirect("/api/auth/signin?callbackUrl=/admin");
  // proxy通過後もRSC側で再確認し、middleware対象外の追加ルートにも備える。
  // 管理画面の存在を非管理者へ露出しないため、layout側では404にする。
  if (session.user.role !== Role.SYSTEM_ADMIN) notFound();

  return (
    <div className="bg-bg-main flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default AdminLayout;
