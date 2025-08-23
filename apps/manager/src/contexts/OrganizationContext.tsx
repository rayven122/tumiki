"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type OrganizationContextType = {
  currentOrganization: {
    id: string;
    name: string;
    isPersonal: boolean;
    isAdmin: boolean;
    memberCount: number;
  } | null;
  setCurrentOrganization: (organizationId: string | null) => Promise<void>;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const [currentOrganization, setCurrentOrganizationState] =
    useState<OrganizationContextType["currentOrganization"]>(null);

  // 組織リストを取得
  const { data: organizations } =
    api.organization.getUserOrganizations.useQuery();

  // デフォルト組織を設定するmutation
  const setDefaultOrgMutation =
    api.organization.setDefaultOrganization.useMutation({
      onSuccess: () => {
        void utils.organization.getUserOrganizations.invalidate();
        toast.success("組織を切り替えました");
      },
      onError: (error) => {
        toast.error(`組織の切り替えに失敗しました: ${error.message}`);
      },
    });

  // 初回ロード時とorganizations更新時に現在の組織を設定
  useEffect(() => {
    if (organizations) {
      // isDefault: trueの組織を探す
      const defaultOrg = organizations.find((org) => org.isDefault);

      if (defaultOrg) {
        setCurrentOrganizationState({
          id: defaultOrg.id,
          name: defaultOrg.name,
          isPersonal: defaultOrg.isPersonal,
          isAdmin: defaultOrg.isAdmin,
          memberCount: defaultOrg.memberCount,
        });
      } else {
        // デフォルトがない場合は個人組織を選択
        const personalOrg = organizations.find((org) => org.isPersonal);
        if (personalOrg) {
          setCurrentOrganizationState({
            id: personalOrg.id,
            name: personalOrg.name,
            isPersonal: personalOrg.isPersonal,
            isAdmin: personalOrg.isAdmin,
            memberCount: personalOrg.memberCount,
          });
        }
      }
      setIsLoading(false);
    }
  }, [organizations]);

  const setCurrentOrganization = async (organizationId: string | null) => {
    try {
      // null の場合は個人組織を選択
      if (organizationId === null) {
        const personalOrg = organizations?.find((org) => org.isPersonal);
        if (personalOrg) {
          organizationId = personalOrg.id;
        }
      }

      // 選択された組織の情報を取得
      const selectedOrg = organizations?.find(
        (org) => org.id === organizationId,
      );
      if (!selectedOrg) {
        throw new Error("組織が見つかりません");
      }

      // 即座にUIを更新（Optimistic update）
      setCurrentOrganizationState({
        id: selectedOrg.id,
        name: selectedOrg.name,
        isPersonal: selectedOrg.isPersonal,
        isAdmin: selectedOrg.isAdmin,
        memberCount: selectedOrg.memberCount,
      });

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

      // バックグラウンドでデフォルト組織を永続化
      await setDefaultOrgMutation.mutateAsync({ organizationId });

      // ページをリフレッシュして新しい組織コンテキストを反映
      router.refresh();
    } catch (error) {
      console.error("Failed to set current organization:", error);
      throw error;
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        setCurrentOrganization,
        isLoading,
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
