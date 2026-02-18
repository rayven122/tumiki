"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganizationContext } from "@/hooks/useOrganizationContext";
import { Building2, User, Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { OrganizationIdSchema } from "@/schema/ids";
import { toast } from "@/lib/client/toast";
import { McpServerIcon } from "@/app/[orgSlug]/mcps/_components/McpServerIcon";
import { type ReactNode, useMemo } from "react";

type OrganizationDisplayProps = {
  name: string;
  logoUrl: string | null;
  isPersonal: boolean;
};

// 組織の表示内容をレンダリング
const renderOrganizationDisplay = ({
  name,
  logoUrl,
  isPersonal,
}: OrganizationDisplayProps): ReactNode => {
  const Icon = isPersonal ? User : Building2;
  const iconClass = isPersonal ? "text-gray-600" : "text-blue-600";

  if (logoUrl) {
    return (
      <>
        <McpServerIcon iconPath={logoUrl} size={16} />
        <span className="font-medium">{name}</span>
      </>
    );
  }

  return (
    <>
      <Icon className={`h-4 w-4 ${iconClass}`} />
      <span className="font-medium">{name}</span>
    </>
  );
};

export const OrganizationSwitcher = () => {
  const {
    organizations,
    currentOrganization,
    setCurrentOrganization,
    isLoading,
    isSwitching,
  } = useOrganizationContext();
  const router = useRouter();

  // 組織を個人・チームに分類
  const { personalOrg, teamOrgs } = useMemo(() => {
    if (!organizations) return { personalOrg: null, teamOrgs: [] };
    const personal = organizations.find((org) => org.isPersonal) ?? null;
    const teams = organizations.filter((org) => !org.isPersonal);
    return { personalOrg: personal, teamOrgs: teams };
  }, [organizations]);

  if (!organizations?.length || isLoading) return null;

  const handleValueChange = (value: string) => {
    if (value === "create_team") {
      router.push("/onboarding");
      return;
    }

    const result = OrganizationIdSchema.safeParse(value);
    if (result.success) {
      setCurrentOrganization(result.data);
    } else {
      toast.error("無効な組織IDです");
    }
  };

  const currentValue = currentOrganization?.id ?? "";

  return (
    <Select
      value={currentValue}
      onValueChange={handleValueChange}
      disabled={isSwitching}
    >
      <SelectTrigger className="w-[200px] border-gray-200 bg-white shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
        <SelectValue>
          <div className="flex items-center space-x-2">
            {isSwitching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                <span className="font-medium">切り替え中...</span>
              </>
            ) : currentOrganization ? (
              renderOrganizationDisplay({
                name: currentOrganization.name,
                logoUrl: currentOrganization.logoUrl,
                isPersonal: currentOrganization.isPersonal,
              })
            ) : null}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {personalOrg && (
          <SelectItem key={personalOrg.id} value={personalOrg.id}>
            <div className="flex items-center space-x-2">
              {personalOrg.logoUrl ? (
                <McpServerIcon iconPath={personalOrg.logoUrl} size={16} />
              ) : (
                <User className="h-4 w-4 text-gray-600" />
              )}
              <span>{personalOrg.name}</span>
            </div>
          </SelectItem>
        )}

        {teamOrgs.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            <div className="flex items-center space-x-2">
              {org.logoUrl ? (
                <McpServerIcon iconPath={org.logoUrl} size={16} />
              ) : (
                <Building2 className="h-4 w-4 text-blue-600" />
              )}
              <span>{org.name}</span>
            </div>
          </SelectItem>
        ))}

        <SelectItem value="create_team" className="mt-1 border-t pt-1">
          <div className="flex items-center space-x-2 text-blue-600">
            <Plus className="h-4 w-4" />
            <span>新しいチームを作成</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
