import { Building2 } from "lucide-react";
import { OrganizationNavigationClient } from "./OrganizationNavigationClient";
import { api } from "@/trpc/server";

export const OrganizationNavigation = async () => {
  try {
    // tRPCを使用して組織一覧を取得
    const organizations = await api.organization.getUserOrganizations();

    // 個人組織を除外（isPersonal: falseのみ）
    const teamOrganizations = organizations.filter((org) => !org.isPersonal);

    return <OrganizationNavigationClient organizations={teamOrganizations} />;
  } catch {
    // 認証されていない場合やエラーの場合
    return (
      <div className="flex items-center space-x-4">
        <div className="text-muted-foreground flex items-center space-x-2 text-sm">
          <Building2 className="h-4 w-4" />
          <span>ログインが必要です</span>
        </div>
      </div>
    );
  }
};
