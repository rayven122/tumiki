import {
  Building2,
  Check,
  Minus,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  effectBadgeClass,
  getGroupById,
  getOrgById,
  getUserById,
  type AssignmentTargetType,
  type IdpSource,
  type MockRole,
  type PolicyEffect,
} from "./idp-ui-mock-data";

export const formatPermissionSummary = (role: MockRole) => {
  const allow = role.permissions.filter((p) => p.effect === "allow").length;
  const deny = role.permissions.filter((p) => p.effect === "deny").length;
  return `許可 ${allow} / 拒否 ${deny}`;
};

export const targetIcon: Record<AssignmentTargetType, LucideIcon> = {
  org: Building2,
  group: Users,
  user: User,
};

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

export const riskLabel = {
  low: "低",
  medium: "中",
  high: "高",
} as const;

export const effectConfig: Record<
  PolicyEffect,
  { label: string; icon: LucideIcon; className: string }
> = {
  allow: {
    label: "許可",
    icon: Check,
    className: effectBadgeClass.allow,
  },
  deny: {
    label: "拒否",
    icon: X,
    className: effectBadgeClass.deny,
  },
  unset: {
    label: "未設定",
    icon: Minus,
    className: effectBadgeClass.unset,
  },
};

export const getAssignmentTargetName = (
  type: AssignmentTargetType,
  id: string,
): string | null => {
  if (type === "org") return getOrgById(id)?.name ?? null;
  if (type === "group") return getGroupById(id)?.name ?? null;
  if (type === "user") return getUserById(id)?.name ?? null;
  const exhaustive: never = type;
  return exhaustive;
};

export const getAssignmentTargetSource = (
  type: AssignmentTargetType,
  id: string,
): IdpSource | null => {
  if (type === "org") return getOrgById(id)?.source ?? null;
  if (type === "group") return getGroupById(id)?.source ?? null;
  if (type === "user") return getUserById(id)?.source ?? null;
  const exhaustive: never = type;
  return exhaustive;
};
