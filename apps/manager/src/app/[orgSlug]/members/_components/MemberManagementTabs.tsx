"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tumiki/ui/tabs";
import { Users, Shield } from "lucide-react";
import { MembersTab } from "./MembersTab";
import { RolesTab } from "./RolesTab";
import { type GetOrganizationBySlugOutput } from "@/features/organization";
import { getSessionInfo } from "~/lib/auth/session-utils";
import { isEEFeatureAvailable } from "@/features/ee";

type MemberManagementTabsProps = {
  organization: GetOrganizationBySlugOutput;
};

export const MemberManagementTabs = ({
  organization,
}: MemberManagementTabsProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  // JWT のロールから管理者権限を取得
  const isAdmin = getSessionInfo(session).isAdmin;

  // ロール管理EE機能が有効かどうか
  const isRoleManagementAvailable = isEEFeatureAvailable("role-management");

  const currentTab = searchParams.get("tab") === "roles" ? "roles" : "members";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "members") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">メンバー管理</h1>
        <p className="text-muted-foreground mt-2">
          {isAdmin
            ? "チームのメンバーとロールを管理します"
            : "チームのメンバーと招待状況を確認できます"}
        </p>
      </div>

      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            メンバー
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="flex items-center gap-2"
            disabled={!isRoleManagementAvailable}
          >
            <Shield className="h-4 w-4" />
            ロール・権限
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <MembersTab organization={organization} />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
