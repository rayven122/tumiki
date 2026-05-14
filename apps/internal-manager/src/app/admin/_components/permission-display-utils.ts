export const sourceLabel = {
  SCIM: "SCIM",
  GROUP: "グループ由来",
  MANUAL: "手動",
  IDP: "IdP",
  TUMIKI: "Tumiki",
} as const;

export const sourceBadgeClass = {
  SCIM: "bg-sky-500/15 text-sky-300",
  GROUP: "bg-violet-500/15 text-violet-300",
  MANUAL: "bg-emerald-500/15 text-emerald-300",
  IDP: "bg-sky-500/15 text-sky-300",
  TUMIKI: "bg-emerald-500/15 text-emerald-300",
} as const;

export const sourceKindLabel = {
  user: "ユーザー個別設定",
  group: "所属グループ",
  org: "所属組織",
  default: "既定",
  catalog: "カタログ",
  none: "未設定",
} as const;

const effectLabel = {
  ALLOW: "許可",
  DENY: "拒否",
  UNSET: "未設定",
} as const;

const effectBadgeClass = {
  ALLOW: "bg-emerald-500/15 text-emerald-300",
  DENY: "bg-red-500/15 text-red-300",
  UNSET: "bg-zinc-500/15 text-zinc-300",
} as const;

const riskLabel = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
} as const;

export const getEffectLabel = (effect: string) =>
  effectLabel[effect as keyof typeof effectLabel] ?? effect;

export const getEffectBadgeClass = (effect: string) =>
  effectBadgeClass[effect as keyof typeof effectBadgeClass] ??
  effectBadgeClass.UNSET;

export const getRiskLabel = (riskLevel: string) =>
  riskLabel[riskLevel as keyof typeof riskLabel] ?? riskLabel.MEDIUM;

export const getUserLabel = (user: {
  name?: string | null;
  email?: string | null;
}) => user.name ?? user.email ?? "名前未設定";
