import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/react";
import type { Theme } from "./_components/ThemeToggle";
import TenantConsoleSidebar from "./_components/TenantConsoleSidebar";

export const metadata: Metadata = {
  title: "Tenant Console — Tumiki テナント管理",
  description: "k3s クラスター上のテナントを管理する内部管理画面",
};

const RootLayout = async ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const cookieStore = await cookies();
  const initialTheme: Theme =
    cookieStore.get("tenant-console-theme")?.value === "light"
      ? "light"
      : "dark";

  return (
    <html lang="ja" data-theme={initialTheme}>
      <body>
        <TRPCReactProvider>
          <div className="bg-bg-main flex h-screen overflow-hidden">
            <TenantConsoleSidebar initialTheme={initialTheme} />
            <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
};

export default RootLayout;
