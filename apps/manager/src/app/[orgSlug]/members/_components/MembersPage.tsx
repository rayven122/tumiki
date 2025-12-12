"use client";

import { type GetOrganizationBySlugOutput } from "@/server/api/routers/organization/getBySlug";
import { MemberList } from "./MemberList";
import { InvitationList } from "./InvitationList";

type MembersPageProps = {
  organization: GetOrganizationBySlugOutput;
};

export const MembersPage = ({ organization }: MembersPageProps) => {
  return (
    <div className="container mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">メンバー管理</h1>
        <p className="text-muted-foreground mt-2">
          チームのメンバーと招待を管理します
        </p>
      </div>

      <MemberList organization={organization} />

      <InvitationList organization={organization} />
    </div>
  );
};
