"use client";

import { User, Building2, Plus, Database } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { Organization } from "@tumiki/db";

interface OrganizationNavigationClientProps {
  organizations: Organization[];
}

export const OrganizationNavigationClient = ({
  organizations,
}: OrganizationNavigationClientProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  const currentOrgId = searchParams.get("org");
  const selectedOrganization = organizations?.find(
    (org) => org.id === currentOrgId,
  );

  // setDefaultOrganization mutation
  const setDefaultOrgMutation = api.organization.setDefaultOrganization.useMutation({
    onSuccess: () => {
      // 組織リストを再取得
      void utils.organization.getUserOrganizations.invalidate();
      toast.success("デフォルト組織を変更しました");
    },
    onError: (error) => {
      toast.error(`組織の切り替えに失敗しました: ${error.message}`);
    },
  });

  const handleValueChange = (value: string) => {
    if (value === "team_usage") {
      router.push(`/onboarding?org=${currentOrgId}`);
      return;
    }

    const params = new URLSearchParams(searchParams);

    if (value === "personal") {
      params.delete("org");

      // 組織固有のページから個人を選択した場合のリダイレクト処理
      if (pathname.startsWith("/organizations/dashboard")) {
        router.push("/mcp/servers");
        return;
      }
      if (pathname.startsWith("/organizations/roles")) {
        router.push("/mcp/servers");
        return;
      }
    } else {
      params.set("org", value);
    }

    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const currentValue = currentOrgId ?? "personal";

  const navigation = selectedOrganization
    ? [
        {
          name: "組織設定",
          href: `/organizations/dashboard?org=${selectedOrganization.id}`,
          icon: Building2,
        },
        {
          name: "ロール管理",
          href: `/organizations/roles?org=${selectedOrganization.id}`,
          icon: User,
        },
        {
          name: "MCPサーバー",
          href: `/mcp/servers?org=${selectedOrganization.id}`,
          icon: Database,
        },
      ]
    : [
        {
          name: "MCPサーバー",
          href: "/mcp/servers",
          icon: Database,
        },
      ];

  return (
    <div className="flex items-center space-x-6">
      {/* 組織セレクター */}
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger className="w-[200px] border-0 bg-transparent shadow-none">
          <div className="flex items-center space-x-2">
            {selectedOrganization ? (
              <>
                <Building2 className="h-4 w-4" />
                <span>{selectedOrganization.name}</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                <span>個人</span>
              </>
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="personal">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>個人</span>
            </div>
          </SelectItem>
          {organizations?.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>{org.name}</span>
              </div>
            </SelectItem>
          ))}
          <SelectItem value="team_usage">
            <div className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>チーム利用</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* ナビゲーションリンク */}
      <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "hover:text-foreground/80 flex items-center space-x-1 transition-colors",
                pathname === item.href
                  ? "text-foreground"
                  : "text-foreground/60",
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
