"use client";

import { type GetOrganizationBySlugOutput } from "@/features/organization";
import { MemberManagementTabs } from "./MemberManagementTabs";

type MembersPageProps = {
  organization: GetOrganizationBySlugOutput;
};

export const MembersPage = ({ organization }: MembersPageProps) => {
  return <MemberManagementTabs organization={organization} />;
};
