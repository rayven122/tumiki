import type { Metadata } from "next";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/react";
import TenantConsoleSidebar from "./_components/TenantConsoleSidebar";

export const metadata: Metadata = {
  title: "Tenant Console — Tumiki テナント管理",
  description: "k3s クラスター上のテナントを管理する内部管理画面",
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="ja">
      <body>
        <TRPCReactProvider>
          <div className="bg-bg-main flex h-screen overflow-hidden">
            <TenantConsoleSidebar />
            <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
};

export default RootLayout;
