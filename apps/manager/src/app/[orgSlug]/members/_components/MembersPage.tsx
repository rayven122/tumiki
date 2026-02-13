"use client";

import { useSession } from "next-auth/react";
import { type GetOrganizationBySlugOutput } from "@/features/organization";
import { MemberList } from "./MemberList";
import { InvitationList } from "./InvitationList";
import { getSessionInfo } from "~/lib/auth/session-utils";

type MembersPageProps = {
  organization: GetOrganizationBySlugOutput;
};

export const MembersPage = ({ organization }: MembersPageProps) => {
  const { data: session } = useSession();

  // JWT のロールから管理者権限を取得
  const isAdmin = getSessionInfo(session).isAdmin;

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">メンバー管理</h1>
        <p className="text-muted-foreground mt-2">
          {isAdmin
            ? "チームのメンバーと招待を管理します"
            : "チームのメンバーと招待状況を確認できます"}
        </p>
      </div>

      <MemberList organization={organization} />

      <InvitationList organization={organization} />
    </div>
  );
};
