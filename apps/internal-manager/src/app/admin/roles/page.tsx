"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { ROLE_DEFINITIONS } from "../_components/mock-data";

export default function AdminRolesPage() {
  const [expanded, setExpanded] = useState<string | null>("r1");
  const [permissions, setPermissions] = useState(() => {
    const map: Record<string, boolean> = {};
    for (const role of ROLE_DEFINITIONS) {
      for (const svc of role.services) {
        for (const tool of svc.tools) {
          map[`${role.id}-${svc.service}-${tool.name}`] = tool.enabled;
        }
      }
    }
    return map;
  });

  const toggle = (key: string) =>
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            ロール管理
          </h1>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            ロール別のツールアクセス権限を設定
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
          }}
        >
          <Plus size={13} />
          ロール追加
        </button>
      </div>

      {/* ロール一覧 */}
      <div className="space-y-2">
        {ROLE_DEFINITIONS.map((role) => {
          const isOpen = expanded === role.id;
          return (
            <div
              key={role.id}
              className="overflow-hidden rounded-xl"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              {/* ロールヘッダー */}
              <button
                type="button"
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
                onClick={() => setExpanded(isOpen ? null : role.id)}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <span
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {role.name}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {role.description}
                </span>
                <span
                  className="ml-2 rounded-full px-2 py-0.5 text-[10px]"
                  style={{
                    backgroundColor: "var(--bg-active)",
                    color: "var(--text-muted)",
                  }}
                >
                  {role.userCount}名
                </span>
                <span
                  className="ml-auto"
                  style={{ color: "var(--text-muted)" }}
                >
                  {isOpen ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </span>
              </button>

              {/* 権限マトリクス */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                    {role.services.map((svc) => {
                      const allEnabled = svc.tools.every(
                        (t) =>
                          permissions[`${role.id}-${svc.service}-${t.name}`],
                      );
                      const someEnabled = svc.tools.some(
                        (t) =>
                          permissions[`${role.id}-${svc.service}-${t.name}`],
                      );
                      return (
                        <div
                          key={svc.service}
                          className="rounded-lg p-3"
                          style={{
                            backgroundColor: "var(--bg-app)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          {/* サービスヘッダー */}
                          <div className="mb-2.5 flex items-center gap-2">
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white"
                              style={{ backgroundColor: svc.color }}
                            >
                              {svc.service.slice(0, 2).toUpperCase()}
                            </span>
                            <span
                              className="text-xs font-medium"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {svc.service}
                            </span>
                            {/* サービス全体トグル */}
                            <button
                              type="button"
                              onClick={() => {
                                const newVal = !allEnabled;
                                setPermissions((prev) => {
                                  const next = { ...prev };
                                  for (const t of svc.tools)
                                    next[
                                      `${role.id}-${svc.service}-${t.name}`
                                    ] = newVal;
                                  return next;
                                });
                              }}
                              className="ml-auto h-4 w-7 rounded-full transition-colors"
                              style={{
                                backgroundColor: allEnabled
                                  ? "var(--badge-success-bg)"
                                  : someEnabled
                                    ? "var(--badge-warn-bg)"
                                    : "var(--bg-active)",
                              }}
                            >
                              <span
                                className="block h-3 w-3 translate-x-0.5 rounded-full transition-transform"
                                style={{
                                  backgroundColor: allEnabled
                                    ? "var(--badge-success-text)"
                                    : someEnabled
                                      ? "var(--badge-warn-text)"
                                      : "var(--text-subtle)",
                                  transform: allEnabled
                                    ? "translateX(14px)"
                                    : "translateX(2px)",
                                }}
                              />
                            </button>
                          </div>

                          {/* ツール一覧 */}
                          <div className="space-y-1.5">
                            {svc.tools.map((tool) => {
                              const key = `${role.id}-${svc.service}-${tool.name}`;
                              const enabled = permissions[key] ?? false;
                              return (
                                <div
                                  key={tool.name}
                                  className="flex items-center justify-between"
                                >
                                  <span
                                    className="font-mono text-[10px]"
                                    style={{
                                      color: enabled
                                        ? "var(--text-secondary)"
                                        : "var(--text-subtle)",
                                    }}
                                  >
                                    {tool.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggle(key)}
                                    className="h-3.5 w-6 rounded-full transition-colors"
                                    style={{
                                      backgroundColor: enabled
                                        ? "var(--badge-success-bg)"
                                        : "var(--bg-active)",
                                    }}
                                  >
                                    <span
                                      className="block h-2.5 w-2.5 rounded-full transition-transform"
                                      style={{
                                        backgroundColor: enabled
                                          ? "var(--badge-success-text)"
                                          : "var(--text-subtle)",
                                        transform: enabled
                                          ? "translateX(12px)"
                                          : "translateX(1px)",
                                      }}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
