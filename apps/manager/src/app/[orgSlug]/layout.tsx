import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import type { ReactNode } from "react";

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
    await api.organization.getBySlug({ slug: decodedSlug });

    return <>{children}</>;
  } catch (error) {
    // 組織が存在しない、またはアクセス権限がない場合はダッシュボードにリダイレクト
    console.error(
      `[OrgSlugLayout] Error fetching organization ${decodedSlug}:`,
      error,
    );
    redirect("/organizations/dashboard");
  }
}
