"use client";

import { User, Building2, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export const OrganizationSelector = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: organizations, isLoading } =
    api.organization.getUserOrganizations.useQuery();

  const currentOrgId = searchParams.get("org");
  const selectedOrganization = organizations?.find(
    (org) => org.id === currentOrgId,
  );

  const handleValueChange = (value: string) => {
    if (value === "team_usage") {
      router.push("/onboarding");
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

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center space-x-2 text-sm">
        <Building2 className="h-4 w-4" />
        <span>読み込み中...</span>
      </div>
    );
  }

  return (
    <Select value={currentValue} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[200px] border-0 bg-transparent shadow-none">
        <div className="flex items-center space-x-2">
          {selectedOrganization ? (
            <>
              <Building2 className="h-4 w-4" />
              <span>{selectedOrganization.organization.name}</span>
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
              <span>{org.organization.name}</span>
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
  );
};
