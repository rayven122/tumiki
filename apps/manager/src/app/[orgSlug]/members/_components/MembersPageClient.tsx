"use client";

import { useSession } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { api } from "@/trpc/react";
import { getSessionInfo } from "~/lib/auth/session-utils";
import { MemberList } from "./MemberList";
import { InvitationList } from "./InvitationList";

type MembersPageClientProps = {
  orgSlug: string;
};

export const MembersPageClient = ({ orgSlug }: MembersPageClientProps) => {
  const { data: session } = useSession();

  // slugから組織情報（members含む）を取得
  const { data: organization, isLoading } = api.organization.getBySlug.useQuery(
    { slug: orgSlug },
  );

  // JWT のロールから管理者権限を取得
  const isAdmin = getSessionInfo(session).isAdmin;

  // ローディング状態
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 p-4">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-1/3 rounded bg-gray-200"></div>
          <div className="h-12 w-full rounded bg-gray-200"></div>
          <div className="h-64 w-full rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (!organization) {
    return (
      <div className="container mx-auto max-w-6xl p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>組織情報の取得に失敗しました。</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 個人の処理
  if (organization?.isPersonal) {
    return (
      <div className="container mx-auto max-w-6xl p-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>個人</AlertTitle>
          <AlertDescription>
            個人ではメンバー管理機能は利用できません。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">メンバー管理</h1>
          <p className="text-muted-foreground mt-1">
            組織のメンバーと招待を管理します
          </p>
        </div>
      </div>

      {/* 閲覧専用モードの通知 */}
      {!isAdmin && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            閲覧専用モードです。メンバーの追加や削除は管理者のみが行えます。
          </AlertDescription>
        </Alert>
      )}

      {/* メンバー一覧 */}
      <MemberList organization={organization} />

      {/* 招待一覧 */}
      <InvitationList organization={organization} />
    </div>
  );
};
