"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Plus, Search, Shield } from "lucide-react";
import {
  getAssignmentsForRole,
  mockRoles,
  roleTypeBadgeClass,
  roleTypeLabel,
  sourceLabel,
  type RoleType,
} from "./idp-ui-mock-data";
import { formatPermissionSummary } from "./idp-ui-helpers";

export const RolesManagementPanel = () => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | RoleType>("all");

  const filteredRoles = useMemo(() => {
    const normalized = search.trim();
    return mockRoles
      .filter((role) => {
        if (filterType !== "all" && role.type !== filterType) return false;
        if (!normalized) return true;
        return (
          role.name.includes(normalized) ||
          role.description.includes(normalized) ||
          sourceLabel[role.source].includes(normalized)
        );
      })
      .map((role) => ({
        role,
        assignmentCount: getAssignmentsForRole(role.id).length,
      }));
  }, [filterType, search]);

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="border-b-border-default shrink-0 border-b px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-text-primary flex items-center gap-2 text-lg font-semibold">
              <Shield size={18} />
              ロール
            </h1>
            <p className="text-text-secondary mt-1 text-xs">
              ツール権限の集合（テンプレート）を定義します。割り当ては「割り当て」または「組織・グループ」から行います。
            </p>
          </div>
          <Link
            href="/admin/roles/new"
            className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium"
          >
            <Plus size={13} />
            カスタムロール作成
          </Link>
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
                placeholder="ロール名・説明で検索"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-bg-active border-border-default text-text-secondary w-full rounded-lg border py-1.5 pr-3 pl-7 text-xs outline-none"
              />
            </div>
            <div
              className="bg-bg-active flex rounded-lg p-0.5 text-[11px]"
              role="group"
              aria-label="ロール種別フィルタ"
            >
              {(["all", "system", "custom"] as const).map((value) => {
                const isActive = filterType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setFilterType(value)}
                    className={`min-h-[32px] rounded-md px-2.5 ${
                      isActive
                        ? "bg-bg-card text-text-primary"
                        : "text-text-muted"
                    }`}
                  >
                    {value === "all"
                      ? "すべて"
                      : value === "system"
                        ? "システム"
                        : "カスタム"}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="text-text-muted text-[11px]">
            {filteredRoles.length} 件 / {mockRoles.length} 件
          </div>
        </div>

        <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
          <div className="border-b-border-default text-text-subtle hidden grid-cols-[1fr_120px_140px_120px_44px] items-center gap-3 border-b px-5 py-3 text-[10px] sm:grid">
            <span>ロール</span>
            <span>種別</span>
            <span>権限</span>
            <span>更新</span>
            <span />
          </div>
          {filteredRoles.length === 0 ? (
            <div className="text-text-muted px-5 py-12 text-center text-xs">
              条件に一致するロールはありません
            </div>
          ) : (
            filteredRoles.map(({ role, assignmentCount }) => {
              return (
                <Link
                  key={role.id}
                  href={`/admin/roles/${role.id}`}
                  className="border-b-border-subtle hover:bg-bg-card-hover block space-y-2 border-b px-5 py-4 text-xs transition-colors sm:grid sm:grid-cols-[1fr_120px_140px_120px_44px] sm:items-center sm:gap-3 sm:space-y-0"
                >
                  <div className="min-w-0">
                    <div className="text-text-primary font-medium">
                      {role.name}
                    </div>
                    <div className="text-text-muted mt-1 line-clamp-1 text-[10px]">
                      {role.description}
                    </div>
                    <div className="text-text-subtle mt-1 text-[10px]">
                      割り当て {assignmentCount} 件
                    </div>
                  </div>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[10px] ${roleTypeBadgeClass[role.type]}`}
                  >
                    {roleTypeLabel[role.type]}
                  </span>
                  <span className="text-text-secondary text-[11px]">
                    {formatPermissionSummary(role)}
                  </span>
                  <span className="text-text-muted text-[10px]">
                    {role.updatedAt}
                  </span>
                  <span className="text-text-muted hidden justify-end sm:flex">
                    {role.readonly ? <Lock size={12} /> : null}
                  </span>
                </Link>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
};
