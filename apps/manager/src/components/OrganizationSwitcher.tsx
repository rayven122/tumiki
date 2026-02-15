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

export const OrganizationSwitcher = () => {
  const {
    organizations,
    currentOrganization,
    setCurrentOrganization,
    isLoading,
    isSwitching,
  } = useOrganizationContext();
  const router = useRouter();

  if (!organizations?.length || isLoading) return null;

  const handleValueChange = (value: string) => {
    if (value === "create_team") {
      // チーム作成ページへ遷移
      router.push("/onboarding");
      return;
    }

    // stringをOrganizationIdにパース
    const result = OrganizationIdSchema.safeParse(value);
    if (result.success) {
      setCurrentOrganization(result.data);
    } else {
      toast.error("無効な組織IDです");
    }
  };

  // 現在の組織IDを取得（必ず組織IDが返される）
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
            ) : currentOrganization?.isPersonal ? (
              <>
                <User className="h-4 w-4 text-gray-600" />
                <span className="font-medium">個人ワークスペース</span>
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="font-medium">{currentOrganization?.name}</span>
              </>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* 個人ワークスペース（1つのみ） */}
        {(() => {
          const personalOrg = organizations.find((org) => org.isPersonal);
          return personalOrg ? (
            <SelectItem key={personalOrg.id} value={personalOrg.id}>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-600" />
                <span>個人ワークスペース</span>
              </div>
            </SelectItem>
          ) : null;
        })()}

        {/* チーム組織 */}
        {organizations
          .filter((org) => !org.isPersonal)
          .map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>{org.name}</span>
                {/* TODO: Week 4でKeycloakから各組織のrolesを取得して管理者バッジを表示 */}
              </div>
            </SelectItem>
          ))}

        {/* チーム作成オプション */}
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
