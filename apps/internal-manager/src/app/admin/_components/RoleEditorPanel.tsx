"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Check,
  Lock,
  Minus,
  Save,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import {
  effectBadgeClass,
  getAssignmentsForRole,
  getGroupById,
  getOrgById,
  getUserById,
  mockTools,
  roleTypeBadgeClass,
  roleTypeLabel,
  sourceBadgeClass,
  sourceLabel,
  type AssignmentTargetType,
  type IdpSource,
  type MockRole,
  type RolePermission,
} from "./idp-ui-mock-data";

type EditableRole = {
  name: string;
  description: string;
  permissions: RolePermission[];
};

type RoleEditorPanelProps = {
  mode: "create" | "edit";
  role?: MockRole;
};

const effectConfig = {
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
} as const;

const riskClass = {
  low: "bg-emerald-500/15 text-emerald-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-red-500/15 text-red-300",
} as const;

const targetIcon = (type: AssignmentTargetType) =>
  type === "org" ? Building2 : type === "group" ? Users : User;

const targetLabel: Record<AssignmentTargetType, string> = {
  org: "階層組織",
  group: "横断グループ",
  user: "ユーザー例外",
};

const getAssignmentTargetName = (
  type: AssignmentTargetType,
  id: string,
): string | null => {
  if (type === "org") return getOrgById(id)?.name ?? null;
  if (type === "group") return getGroupById(id)?.name ?? null;
  return getUserById(id)?.name ?? null;
};

const getAssignmentTargetSource = (
  type: AssignmentTargetType,
  id: string,
): IdpSource | null => {
  if (type === "org") return getOrgById(id)?.source ?? null;
  if (type === "group") return getGroupById(id)?.source ?? null;
  return getUserById(id)?.source ?? null;
};

const initialState = (role?: MockRole): EditableRole => ({
  name: role?.name ?? "",
  description: role?.description ?? "",
  permissions: role?.permissions ?? [],
});

export const RoleEditorPanel = ({ mode, role }: RoleEditorPanelProps) => {
  const readonly = role?.readonly ?? false;
  const [state, setState] = useState<EditableRole>(() => initialState(role));

  const assignments = useMemo(
    () => (role ? getAssignmentsForRole(role.id) : []),
    [role],
  );

  const setEffect = (toolId: string, effect: "allow" | "deny" | "unset") => {
    setState((current) => {
      const others = current.permissions.filter((p) => p.toolId !== toolId);
      if (effect === "unset") return { ...current, permissions: others };
      return { ...current, permissions: [...others, { toolId, effect }] };
    });
  };

  const getEffect = (toolId: string): "allow" | "deny" | "unset" =>
    state.permissions.find((p) => p.toolId === toolId)?.effect ?? "unset";

  const allowCount = state.permissions.filter(
    (p) => p.effect === "allow",
  ).length;
  const denyCount = state.permissions.filter((p) => p.effect === "deny").length;

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="border-b-border-default shrink-0 border-b px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/admin/roles"
              className="text-text-muted hover:text-text-primary mb-2 inline-flex items-center gap-1 text-[11px]"
            >
              <ArrowLeft size={12} />
              ロール一覧へ
            </Link>
            <h1 className="text-text-primary flex items-center gap-2 text-lg font-semibold">
              <Shield size={18} />
              {mode === "create" ? "カスタムロール作成" : (role?.name ?? "")}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {role ? (
                <>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${roleTypeBadgeClass[role.type]}`}
                  >
                    {roleTypeLabel[role.type]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${sourceBadgeClass[role.source]}`}
                  >
                    {sourceLabel[role.source]}
                  </span>
                  {readonly ? (
                    <span className="bg-bg-active text-text-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]">
                      <Lock size={10} />
                      readonly
                    </span>
                  ) : null}
                </>
              ) : (
                <p className="text-text-secondary text-xs">
                  権限の集合を定義します。作成後、ディレクトリ管理で組織・グループ・ユーザーに割り当てられます。
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === "edit" && !readonly ? (
              <button
                type="button"
                disabled
                className="bg-bg-active flex min-h-[44px] cursor-not-allowed items-center gap-1.5 rounded-lg px-3 text-xs text-red-300 disabled:opacity-50"
              >
                <Trash2 size={13} />
                削除
              </button>
            ) : null}
            <button
              type="button"
              disabled={readonly}
              className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] cursor-not-allowed items-center gap-1.5 rounded-lg px-3 text-xs font-medium disabled:opacity-50"
            >
              <Save size={13} />
              {mode === "create" ? "作成" : "保存"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="bg-bg-card border-border-default rounded-xl border p-5">
              <h2 className="text-text-primary mb-4 text-sm font-semibold">
                基本情報
              </h2>
              <div className="space-y-4">
                <label className="block">
                  <span className="text-text-muted text-[11px]">
                    ロール名
                    <span className="text-red-300"> *</span>
                  </span>
                  <input
                    type="text"
                    value={state.name}
                    onChange={(event) =>
                      setState({ ...state, name: event.target.value })
                    }
                    disabled={readonly}
                    placeholder="例: AI 推進メンバー"
                    className="bg-bg-active border-border-default text-text-primary mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none disabled:opacity-50"
                  />
                </label>
                <label className="block">
                  <span className="text-text-muted text-[11px]">説明</span>
                  <textarea
                    value={state.description}
                    onChange={(event) =>
                      setState({ ...state, description: event.target.value })
                    }
                    disabled={readonly}
                    rows={3}
                    placeholder="このロールの目的や対象を記述"
                    className="bg-bg-active border-border-default text-text-primary mt-1 w-full resize-none rounded-lg border px-3 py-2 text-xs outline-none disabled:opacity-50"
                  />
                </label>
              </div>
            </section>

            <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
              <div className="border-b-border-default px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-text-primary text-sm font-semibold">
                      ツール権限
                    </h2>
                    <p className="text-text-muted mt-0.5 text-[10px]">
                      MCP カタログのツール単位で許可・拒否を設定
                    </p>
                  </div>
                  <div className="text-text-muted flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1">
                      <Check size={11} className="text-emerald-300" />
                      {allowCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <X size={11} className="text-red-300" />
                      {denyCount}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-b-border-default text-text-subtle hidden grid-cols-[1fr_80px_140px] items-center gap-3 border-b px-5 py-3 text-[10px] sm:grid">
                <span>提供ツール</span>
                <span>リスク</span>
                <span className="text-right">効果</span>
              </div>
              {mockTools.map((tool) => {
                const effect = getEffect(tool.id);
                return (
                  <div
                    key={tool.id}
                    className="border-b-border-subtle grid grid-cols-[1fr_auto] items-center gap-3 border-b px-5 py-4 text-xs sm:grid-cols-[1fr_80px_140px]"
                  >
                    <div className="min-w-0">
                      <div className="text-text-primary font-medium">
                        {tool.name}
                      </div>
                      <div className="text-text-muted mt-1 font-mono text-[10px]">
                        {tool.catalog}
                      </div>
                    </div>
                    <span
                      className={`w-fit rounded-full px-2 py-0.5 text-[10px] ${riskClass[tool.risk]}`}
                    >
                      {tool.risk}
                    </span>
                    <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                      {(["allow", "deny", "unset"] as const).map(
                        (candidate) => {
                          const cfg = effectConfig[candidate];
                          const Icon = cfg.icon;
                          return (
                            <button
                              key={candidate}
                              type="button"
                              onClick={() => setEffect(tool.id, candidate)}
                              disabled={readonly}
                              aria-pressed={effect === candidate}
                              aria-label={`${tool.name} を${cfg.label}`}
                              title={cfg.label}
                              className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-40 ${
                                effect === candidate
                                  ? cfg.className
                                  : "bg-bg-active text-text-muted opacity-50 hover:opacity-100"
                              }`}
                            >
                              <Icon size={13} />
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="bg-bg-card border-border-default rounded-xl border p-4">
              <h3 className="text-text-primary mb-3 text-sm font-semibold">
                サマリー
              </h3>
              <div className="space-y-2 text-xs">
                <div className="bg-bg-active flex items-center justify-between gap-3 rounded-lg px-3 py-2">
                  <span className="text-text-muted">許可ツール</span>
                  <span className="text-text-primary font-medium">
                    {allowCount}
                  </span>
                </div>
                <div className="bg-bg-active flex items-center justify-between gap-3 rounded-lg px-3 py-2">
                  <span className="text-text-muted">拒否ツール</span>
                  <span className="text-text-primary font-medium">
                    {denyCount}
                  </span>
                </div>
                {role ? (
                  <div className="bg-bg-active flex items-center justify-between gap-3 rounded-lg px-3 py-2">
                    <span className="text-text-muted">割り当て先</span>
                    <span className="text-text-primary font-medium">
                      {assignments.length} 件
                    </span>
                  </div>
                ) : null}
              </div>
            </section>

            {role ? (
              <section className="bg-bg-card border-border-default rounded-xl border p-4">
                <h3 className="text-text-primary mb-3 text-sm font-semibold">
                  割り当て先
                </h3>
                {assignments.length === 0 ? (
                  <div className="text-text-muted bg-bg-active rounded-lg px-3 py-4 text-center text-[11px]">
                    まだどこにも割り当てられていません
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((assignment) => {
                      const TargetIcon = targetIcon(assignment.targetType);
                      const targetName = getAssignmentTargetName(
                        assignment.targetType,
                        assignment.targetId,
                      );
                      const source = getAssignmentTargetSource(
                        assignment.targetType,
                        assignment.targetId,
                      );
                      return (
                        <div
                          key={assignment.id}
                          className="bg-bg-active border-border-subtle rounded-lg border px-3 py-2.5 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <TargetIcon
                              size={12}
                              className="text-text-secondary"
                            />
                            <span className="text-text-primary truncate font-medium">
                              {targetName ?? "不明"}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <span className="bg-bg-card text-text-muted rounded-full px-1.5 py-0.5 text-[9px]">
                              {targetLabel[assignment.targetType]}
                            </span>
                            {source ? (
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[9px] ${sourceBadgeClass[source]}`}
                              >
                                {sourceLabel[source]}
                              </span>
                            ) : null}
                            {assignment.inherited ? (
                              <span className="bg-bg-card text-text-muted rounded-full px-1.5 py-0.5 text-[9px]">
                                継承
                              </span>
                            ) : null}
                            {assignment.expiresAt ? (
                              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] text-amber-300">
                                期限 {assignment.expiresAt}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : (
              <section className="bg-bg-card border-border-default rounded-xl border p-4 text-[11px]">
                <h3 className="text-text-primary mb-2 text-sm font-semibold">
                  作成後の流れ
                </h3>
                <ol className="text-text-secondary list-decimal space-y-1.5 pl-4">
                  <li>このフォームでロール定義を保存</li>
                  <li>ディレクトリ管理で対象を選んで割り当て</li>
                  <li>権限管理 &gt; 解決済み権限で結果を確認</li>
                </ol>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};
