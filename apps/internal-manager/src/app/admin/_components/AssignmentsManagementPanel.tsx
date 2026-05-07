"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Link2, Plus, Search } from "lucide-react";
import {
  getRoleById,
  mockRoleAssignments,
  roleTypeBadgeClass,
  roleTypeLabel,
  sourceBadgeClass,
  sourceLabel,
  type AssignmentTargetType,
} from "./idp-ui-mock-data";
import {
  formatPermissionSummary,
  getAssignmentTargetName,
  getAssignmentTargetSource,
  targetIcon,
  targetLabel,
} from "./idp-ui-helpers";

export const AssignmentsManagementPanel = () => {
  const [filter, setFilter] = useState<"all" | AssignmentTargetType>("all");
  const [search, setSearch] = useState("");

  const filteredAssignments = useMemo(() => {
    const normalized = search.trim();
    return mockRoleAssignments.filter((assignment) => {
      if (filter !== "all" && assignment.targetType !== filter) return false;
      if (!normalized) return true;
      const role = getRoleById(assignment.roleId);
      const targetName = getAssignmentTargetName(
        assignment.targetType,
        assignment.targetId,
      );
      return (
        (role?.name.includes(normalized) ?? false) ||
        (targetName?.includes(normalized) ?? false) ||
        (assignment.reason?.includes(normalized) ?? false)
      );
    });
  }, [filter, search]);

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="border-b-border-default shrink-0 border-b px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-text-primary flex items-center gap-2 text-lg font-semibold">
              <Link2 size={18} />
              ロール適用
            </h1>
            <p className="text-text-secondary mt-1 text-xs">
              ロールを組織・グループ・ユーザーに適用している一覧です
            </p>
          </div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="モック UI のため未実装"
            className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] cursor-not-allowed items-center gap-1.5 rounded-lg px-3 text-xs font-medium opacity-60"
          >
            <Plus size={13} />
            ロールを適用
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search
                size={12}
                className="text-text-muted absolute top-1/2 left-2.5 -translate-y-1/2"
              />
              <input
                type="text"
                aria-label="ロール適用検索"
                placeholder="ロール名・対象名・理由で検索"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-bg-active border-border-default text-text-secondary w-full rounded-lg border py-1.5 pr-3 pl-7 text-xs outline-none"
              />
            </div>
            <div
              className="bg-bg-active flex rounded-lg p-0.5 text-[11px]"
              role="group"
              aria-label="対象種別フィルタ"
            >
              {(["all", "org", "group", "user"] as const).map((value) => {
                const isActive = filter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setFilter(value)}
                    className={`min-h-[44px] rounded-md px-2.5 ${
                      isActive
                        ? "bg-bg-card text-text-primary"
                        : "text-text-muted"
                    }`}
                  >
                    {value === "all" ? "すべて" : targetLabel[value]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="text-text-muted text-[11px]">
            {filteredAssignments.length} 件 / {mockRoleAssignments.length} 件
          </div>
        </div>

        <section
          aria-label="ロール適用一覧"
          className="bg-bg-card border-border-default overflow-hidden rounded-xl border"
        >
          <div className="border-b-border-default text-text-subtle hidden grid-cols-[1fr_1fr_140px_160px] items-center gap-3 border-b px-5 py-3 text-[10px] sm:grid">
            <span>ロール</span>
            <span>対象</span>
            <span>属性</span>
            <span>理由 / 期限</span>
          </div>
          {filteredAssignments.length === 0 ? (
            <div className="text-text-muted px-5 py-12 text-center text-xs">
              条件に一致するロール適用はありません
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const role = getRoleById(assignment.roleId);
              const targetName = getAssignmentTargetName(
                assignment.targetType,
                assignment.targetId,
              );
              const TargetIcon = targetIcon[assignment.targetType];
              const source = getAssignmentTargetSource(
                assignment.targetType,
                assignment.targetId,
              );
              return (
                <div
                  key={assignment.id}
                  className="border-b-border-subtle hover:bg-bg-card-hover block space-y-2 border-b px-5 py-4 text-xs transition-colors sm:grid sm:grid-cols-[1fr_1fr_140px_160px] sm:items-center sm:gap-3 sm:space-y-0"
                >
                  <div className="min-w-0">
                    {role ? (
                      <Link
                        href={`/admin/roles/${role.id}`}
                        className="text-text-primary hover:text-text-link block truncate font-medium"
                      >
                        {role.name}
                      </Link>
                    ) : (
                      <span className="text-text-muted">不明なロール</span>
                    )}
                    {role ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] ${roleTypeBadgeClass[role.type]}`}
                        >
                          {roleTypeLabel[role.type]}
                        </span>
                        <span className="text-text-muted text-[10px]">
                          {formatPermissionSummary(role)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <TargetIcon size={13} className="text-text-secondary" />
                    <Link
                      href={
                        assignment.targetType === "user"
                          ? `/admin/users/${assignment.targetId}`
                          : `/admin/directory?tab=${
                              assignment.targetType === "org"
                                ? "organizations"
                                : "groups"
                            }`
                      }
                      className="text-text-primary hover:text-text-link truncate"
                    >
                      {targetName ?? "不明"}
                    </Link>
                    {source ? (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] ${sourceBadgeClass[source]}`}
                      >
                        {sourceLabel[source]}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="bg-bg-active text-text-secondary rounded-full px-2 py-0.5 text-[9px]">
                      {targetLabel[assignment.targetType]}
                    </span>
                    {assignment.inherited ? (
                      <span className="bg-bg-active text-text-muted rounded-full px-2 py-0.5 text-[9px]">
                        継承
                      </span>
                    ) : null}
                  </div>
                  <div className="text-text-muted text-[10px]">
                    {assignment.reason ? (
                      <div className="line-clamp-2">{assignment.reason}</div>
                    ) : null}
                    {assignment.expiresAt ? (
                      <div className="mt-0.5 text-amber-300">
                        期限 {assignment.expiresAt}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
};
