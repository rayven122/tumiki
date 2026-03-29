import type { JSX } from "react";
import { ROLE_DEFINITIONS } from "../../data/admin-mock";

// ロール管理ページ
export const AdminRoles = (): JSX.Element => {
  return (
    <div className="space-y-4 p-6">
      <h2
        className="text-lg font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        ロール管理
      </h2>

      <div className="space-y-3">
        {ROLE_DEFINITIONS.map((role) => (
          <div
            key={role.name}
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: role.color }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {role.name}
              </span>
              <span
                className="text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                {role.userCount} users
              </span>
            </div>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              {role.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
