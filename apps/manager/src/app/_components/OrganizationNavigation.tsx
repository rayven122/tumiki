"use client";

import { User, Building2, Plus } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { api } from "@/trpc/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export const OrganizationNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: organizations, isLoading } =
    api.organization.getUserOrganizations.useQuery();

  const currentOrgId = searchParams.get("org");
  const selectedOrganization = organizations?.find(
    (org) => org.id === currentOrgId,
  );

  const handleValueChange = (value: string) => {
    if (value === "team_usage") {
      router.push(`/onboarding?org=${currentOrgId}`);
      return;
    }

    const params = new URLSearchParams(searchParams);

    if (value === "personal") {
      params.delete("org");
    } else {
      params.set("org", value);
    }

    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const currentValue = currentOrgId ?? "personal";

  // 基本ナビゲーション
  const baseNavigation = [{ name: "MCPサーバー", href: "/mcp/servers" }];

  // 組織が選択されている場合の追加ナビゲーション
  const organizationNavigation = selectedOrganization
    ? [
        {
          name: "組織設定",
          href: `/organizations/dashboard?org=${selectedOrganization.id}`,
        },
        {
          name: "ロール管理",
          href: `/organizations/roles?org=${selectedOrganization.id}`,
        },
      ]
    : [];

  const navigation = [...organizationNavigation, ...baseNavigation];

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="text-muted-foreground flex items-center space-x-2 text-sm">
          <Building2 className="h-4 w-4" />
          <span>読み込み中...</span>
        </div>
      </div>
    );
  }

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
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "hover:text-foreground/80 transition-colors",
              pathname === item.href ? "text-foreground" : "text-foreground/60",
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
};
