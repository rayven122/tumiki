"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { Building2, User, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export const OrganizationSwitcher = () => {
  const { data: organizations } =
    api.organization.getUserOrganizations.useQuery();
  const { currentOrganization, setCurrentOrganization, isLoading } =
    useOrganizationContext();
  const router = useRouter();

  if (!organizations?.length || isLoading) return null;

  const handleValueChange = async (value: string) => {
    if (value === "create_team") {
      // チーム作成ページへ遷移
      router.push("/onboarding");
      return;
    }

    try {
      await setCurrentOrganization(value === "personal" ? null : value);
    } catch (error) {
      // エラーはContextで処理済み
      console.error("Failed to switch organization:", error);
    }
  };

  // 現在の組織IDを取得（個人組織の場合は"personal"）
  const currentValue = currentOrganization?.isPersonal
    ? "personal"
    : (currentOrganization?.id ?? "personal");

  return (
    <Select value={currentValue} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[250px] border-gray-200 bg-white shadow-sm hover:bg-gray-50">
        <SelectValue>
          <div className="flex items-center space-x-2">
            {currentOrganization?.isPersonal ? (
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
        {/* 個人ワークスペース */}
        {organizations.some((org) => org.isPersonal) && (
          <SelectItem value="personal">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-600" />
              <span>個人ワークスペース</span>
            </div>
          </SelectItem>
        )}

        {/* チーム組織 */}
        {organizations
          .filter((org) => !org.isPersonal)
          .map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>{org.name}</span>
                {org.isAdmin && (
                  <span className="ml-auto text-xs text-gray-500">管理者</span>
                )}
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
