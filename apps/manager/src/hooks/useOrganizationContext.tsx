"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";
import { type OrganizationId } from "@/schema/ids";
import { type getUserOrganizationsProtectedOutputSchema } from "@/features/organization";
import { type z } from "zod";
import { getSessionInfo } from "~/lib/auth/session-utils";

// tRPCのZod型定義から型を生成
type Organization = z.infer<
  typeof getUserOrganizationsProtectedOutputSchema
>[number];

type OrganizationContextType = {
  organizations: Organization[] | undefined;
  currentOrganization: {
    id: OrganizationId;
    name: string;
    isPersonal: boolean;
    // isAdmin削除: JWTのrolesで判定（session.user.isOrganizationAdmin）
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
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const utils = api.useUtils();

  // 組織データが不要なページでは取得しない
  const isPublicPage =
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/invite") ||
    pathname === "/" ||
    pathname === "/jp";

  // 認証済みユーザーのみ組織リストを取得（パブリックページでは取得しない）
  const { data: organizations, isLoading } =
    api.organization.getUserOrganizations.useQuery(undefined, {
      enabled: !isPublicPage && status === "authenticated" && !!session?.user,
      retry: false,
      refetchOnWindowFocus: false,
    });

  // 現在の組織はsessionのorganizationIdから取得
  // organizationsリストから詳細情報を補完
  const { organizationId } = getSessionInfo(session);
  const currentOrganization = organizationId
    ? (() => {
        const org = organizations?.find((o) => o.id === organizationId);
        if (!org) return null;
        return {
          id: org.id,
          name: org.name,
          isPersonal: org.isPersonal,
          // isAdmin削除: JWTのrolesで判定（session.user.tumiki.roles）
          memberCount: org.memberCount,
        };
      })()
    : null;

  // デフォルト組織を設定するmutation
  const setDefaultOrgMutation =
    api.organization.setDefaultOrganization.useMutation({
      onSuccess: async (data) => {
        toast.success("組織を切り替えました");

        // Auth.jsのセッションを強制更新
        // DBの最新のdefaultOrganization情報を取得
        await update({});

        // tRPCの全キャッシュを無効化して最新データを取得
        await utils.invalidate();

        // 新しい組織のページへ遷移
        router.push(`/${data.organizationSlug}/mcps`);
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

    // mutationを実行
    setDefaultOrgMutation.mutate({ organizationId });
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
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
