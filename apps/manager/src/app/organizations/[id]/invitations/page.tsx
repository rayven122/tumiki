"use client";

import { useParams } from "next/navigation";
import { MailIcon, UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { InvitationForm } from "@/components/invitations/InvitationForm";
import { InvitationTable } from "@/components/invitations/InvitationTable";

/**
 * 組織の招待管理ページ
 * 招待の作成、一覧表示、管理機能を提供
 */
const OrganizationInvitationsPage = () => {
  const params = useParams();
  const organizationId = params.id as string;

  // 招待一覧を取得
  const { data: invitations, isLoading, error } = trpc.organizationInvitation.getByOrganization.useQuery(
    { organizationId },
    {
      enabled: !!organizationId,
    }
  );

  // 組織情報を取得（TODO: 組織取得APIの実装後に有効化）
  // const { data: organization } = trpc.organization.getById.useQuery(
  //   { id: organizationId },
  //   { enabled: !!organizationId }
  // );

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>招待一覧の取得に失敗しました</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UsersIcon className="size-8" />
            メンバー招待管理
          </h1>
          <p className="text-muted-foreground mt-1">
            組織への新しいメンバー招待を管理します
          </p>
        </div>
        <InvitationForm organizationId={organizationId} />
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              送信済み招待
            </CardTitle>
            <MailIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invitations?.length ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              有効な招待
            </CardTitle>
            <MailIcon className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {invitations?.filter(inv => !inv.isExpired).length ?? 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              期限切れ招待
            </CardTitle>
            <MailIcon className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {invitations?.filter(inv => inv.isExpired).length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 招待一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>招待一覧</CardTitle>
          <CardDescription>
            送信済みの招待を確認・管理できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">読み込み中...</p>
            </div>
          ) : (
            <InvitationTable
              organizationId={organizationId}
              invitations={invitations ?? []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationInvitationsPage;