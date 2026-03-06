"use client";

import { type GetOrganizationBySlugOutput } from "@/features/organization";
import { MemberList } from "./MemberList";
import { InvitationList } from "./InvitationList";

type MembersTabProps = {
  organization: GetOrganizationBySlugOutput;
};

export const MembersTab = ({ organization }: MembersTabProps) => {
  return (
    <div className="space-y-8">
      <MemberList organization={organization} />
      <InvitationList organization={organization} />
    </div>
  );
};
