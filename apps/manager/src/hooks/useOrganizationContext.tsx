"use client";

import { createContext, useContext, type ReactNode } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "@/utils/client/toast";
import { type OrganizationId } from "@/schema/ids";

type OrganizationContextType = {
  currentOrganization: {
    id: OrganizationId;
    name: string;
    isPersonal: boolean;
    isAdmin: boolean;
    memberCount: number;
  } | null;
  setCurrentOrganization: (organizationId: OrganizationId) => void;
  isLoading: boolean;
  isSwitching: boolean;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined,
);

type OrganizationProviderProps = {
  children: ReactNode;
};

export const OrganizationProvider = ({
  children,
}: OrganizationProviderProps) => {
  const router = useRouter();
  const utils = api.useUtils();

  // 組織リストを取得（既にdefaultOrgが設定済み）
  const { data: organizations, isLoading } =
    api.organization.getUserOrganizations.useQuery();

  // 現在の組織はorganizationsから取得
  const currentOrganization =
    organizations?.find((org) => org.isDefault) ?? null;

  // デフォルト組織を設定するmutation
  const setDefaultOrgMutation =
    api.organization.setDefaultOrganization.useMutation({
      onSuccess: async () => {
        // すべてのtRPCクエリを再取得
        await utils.invalidate();
        toast.success("組織を切り替えました");
        // ページをリフレッシュして新しい組織コンテキストを反映
        router.refresh();
      },
      onError: (error) => {
        toast.error(`組織の切り替えに失敗しました: ${error.message}`);
      },
    });

  const setCurrentOrganization = (organizationId: OrganizationId) => {
    // 選択された組織の情報を取得
    const selectedOrg = organizations?.find((org) => org.id === organizationId);
    if (!selectedOrg) {
      toast.error("組織が見つかりません");
      return;
    }

    // 個人組織を選択した場合、組織固有のページからリダイレクト
    if (selectedOrg.isPersonal) {
      const currentPath = window.location.pathname;
      if (
        currentPath.startsWith("/organizations/dashboard") ||
        currentPath.startsWith("/organizations/roles")
      ) {
        router.push("/mcp/servers");
      }
    }

    // mutationを実行
    setDefaultOrgMutation.mutate({ organizationId });
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        setCurrentOrganization,
        isLoading,
        isSwitching: setDefaultOrgMutation.isPending,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganizationContext = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganizationContext must be used within an OrganizationProvider",
    );
  }
  return context;
};
