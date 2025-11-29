import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import type { ReactNode } from "react";
import { SimpleHeader } from "./_components/SimpleHeader";
import { OrgSidebar } from "./_components/OrgSidebar";

type OrgSlugLayoutProps = {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
};

export default async function OrgSlugLayout({
  children,
  params,
}: OrgSlugLayoutProps) {
  const { orgSlug } = await params;
  // URLデコードを明示的に行う（@などの特殊文字対応）
  const decodedSlug = decodeURIComponent(orgSlug);

  try {
    // スラッグから組織情報を取得（アクセス権限も検証される）
    const organization = await api.organization.getBySlug({
      slug: decodedSlug,
    });

    return (
      <div className="flex min-h-screen flex-col">
        {/* ヘッダー */}
        <SimpleHeader />

        {/* メインコンテンツエリア */}
        <div className="flex flex-1">
          {/* サイドバー */}
          <OrgSidebar
            orgSlug={decodedSlug}
            isPersonal={organization.isPersonal}
          />

          {/* ページコンテンツ */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    );
  } catch (error) {
    // 組織が存在しない、またはアクセス権限がない場合はダッシュボードにリダイレクト
    console.error(
      `[OrgSlugLayout] Error fetching organization ${decodedSlug}:`,
      error,
    );
    redirect("/organizations/dashboard");
  }
}
