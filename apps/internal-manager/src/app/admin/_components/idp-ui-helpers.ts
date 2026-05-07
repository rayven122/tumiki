import { Building2, User, Users, type LucideIcon } from "lucide-react";
import {
  getGroupById,
  getOrgById,
  getUserById,
  type AssignmentTargetType,
  type IdpSource,
  type MockRole,
} from "./idp-ui-mock-data";

export const formatPermissionSummary = (role: MockRole) => {
  const allow = role.permissions.filter((p) => p.effect === "allow").length;
  const deny = role.permissions.filter((p) => p.effect === "deny").length;
  return `許可 ${allow} / 拒否 ${deny}`;
};

export const targetIcon = (type: AssignmentTargetType): LucideIcon =>
  type === "org" ? Building2 : type === "group" ? Users : User;

export const targetLabel: Record<AssignmentTargetType, string> = {
  org: "階層組織",
  group: "横断グループ",
  user: "ユーザー例外",
};

export const riskBadgeClass = {
  low: "bg-emerald-500/15 text-emerald-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-red-500/15 text-red-300",
} as const;

export const getAssignmentTargetName = (
  type: AssignmentTargetType,
  id: string,
): string | null => {
  if (type === "org") return getOrgById(id)?.name ?? null;
  if (type === "group") return getGroupById(id)?.name ?? null;
  return getUserById(id)?.name ?? null;
};

export const getAssignmentTargetSource = (
  type: AssignmentTargetType,
  id: string,
): IdpSource | null => {
  if (type === "org") return getOrgById(id)?.source ?? null;
  if (type === "group") return getGroupById(id)?.source ?? null;
  return getUserById(id)?.source ?? null;
};
