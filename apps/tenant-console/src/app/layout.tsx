import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: "Tenant Console — Tumiki テナント管理",
  description: "k3s クラスター上のテナントを管理する内部管理画面",
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="ja">
      <body>
        <TRPCReactProvider>
          <nav className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-5xl px-4">
              <div className="flex h-14 items-center gap-6">
                <span className="text-sm font-bold text-gray-900">
                  Tenant Console
                </span>
                <Link
                  href="/tenants"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  テナント
                </Link>
                <Link
                  href="/licenses"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ライセンス
                </Link>
                <Link
                  href="/monitoring"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Pod 監視
                </Link>
              </div>
            </div>
          </nav>
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
};

export default RootLayout;
