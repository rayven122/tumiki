import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import type { ReactNode } from "react";
import { SimpleHeader } from "./_components/SimpleHeader";
import { OrgSidebar } from "./_components/OrgSidebar";
import { MainContent } from "./_components/MainContent";
import { auth } from "~/auth";
import { hasAdminRole } from "~/lib/auth/session-utils";
import { parseOrgRolesFromGroupPaths } from "@/features/user/api/getTumikiClaims";

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

  // auth.jsのセッションを取得
  const session = await auth();

  // session が存在しない場合は空を返す
  // proxy.ts でログイン画面に遷移されるため、 redirect は不要
  if (!session?.user) {
    return null;
  }

  try {
    // スラッグから組織情報を取得（アクセス権限も検証される）
    const organization = await api.organization.getBySlug({
      slug: decodedSlug,
    });

    // デフォルト組織とURLの組織が異なる場合、デフォルト組織を更新
    // （次回ログイン時に最後に使用した組織へリダイレクトするため）
    if (organization.defaultOrgSlug !== decodedSlug) {
      await api.organization.setDefaultOrganization({
        organizationId: organization.id,
      });
    }

    // URLの組織に基づいてロールを判定
    // セッションのデフォルト組織ではなく、現在アクセス中の組織のロールを使用
    const tumikiGroupRoles = session.user?.tumiki?.group_roles ?? [];
    const currentOrgRoles = organization.isPersonal
      ? ["Owner"]
      : parseOrgRolesFromGroupPaths(tumikiGroupRoles, decodedSlug);
    const isAdmin = hasAdminRole(currentOrgRoles);

    return (
      <div className="flex min-h-screen flex-col">
        {/* ヘッダー */}
        <SimpleHeader />

        {/* サイドバー */}
        <OrgSidebar
          orgSlug={decodedSlug}
          isPersonal={organization.isPersonal}
          organizationId={organization.id}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
        />

        {/* ページコンテンツ */}
        <MainContent>{children}</MainContent>
      </div>
    );
  } catch {
    // 組織が見つからない場合は想定される動作（新規ユーザー、無効なスラグ等）
    // リカバリー処理で個人組織またはオンボーディングにリダイレクトする

    // アクセスエラーの場合、個人組織をdefaultに設定してリダイレクト
    try {
      // ユーザーの組織一覧を取得（個人組織が最初）
      const organizations = await api.organization.getUserOrganizations();

      // 個人組織を探す
      const personalOrg = organizations.find((org) => org.isPersonal);

      if (personalOrg) {
        // defaultOrganizationを個人組織に更新
        await api.organization.setDefaultOrganization({
          organizationId: personalOrg.id,
        });

        // 個人組織にリダイレクト
        redirect(`/${personalOrg.slug}/mcps`);
      }
    } catch (recoveryError) {
      console.error(
        "[OrgSlugLayout] Failed to recover from error:",
        recoveryError,
      );
    }

    // リカバリー失敗時はオンボーディングへ
    redirect("/onboarding");
  }
}
