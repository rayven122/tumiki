"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Search, X } from "lucide-react";
import { api } from "~/trpc/react";

// @tumiki/internal-db を client で import すると Prisma の node: モジュールが混入するため、文字列定数として再定義する。
const PolicyEffect = { ALLOW: "ALLOW", DENY: "DENY" } as const;

type PolicyEffectValue =
  | (typeof PolicyEffect)[keyof typeof PolicyEffect]
  | null;

const AdminRolesPage = () => {
  const [search, setSearch] = useState("");
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState<string | null>(
    null,
  );

  const utils = api.useUtils();
  const policyMatrixQuery = api.mcpPolicies.getMatrix.useQuery({
    orgUnitId: selectedOrgUnitId,
  });
  const updateToolPermission = api.mcpPolicies.updateToolPermission.useMutation(
    {
      onSuccess: () => utils.mcpPolicies.getMatrix.invalidate(),
    },
  );

  const orgUnits = policyMatrixQuery.data?.orgUnits ?? [];
  const catalogs = policyMatrixQuery.data?.catalogs ?? [];
  const selectedOrgUnit =
    orgUnits.find((unit) => unit.id === selectedOrgUnitId) ?? null;
  const selectedPermissionByTool = useMemo(
    () =>
      new Map(
        catalogs.flatMap((catalog) =>
          catalog.tools.flatMap((tool) =>
            tool.orgUnitPermissions.map(
              (permission) => [tool.id, permission.effect] as const,
            ),
          ),
        ),
      ),
    [catalogs],
  );
  const filteredOrgUnits = orgUnits.filter(
    (unit) =>
      search === "" ||
      unit.name.includes(search) ||
      unit.path.includes(search) ||
      unit.externalId.includes(search),
  );
  const toolCount = catalogs.reduce(
    (count, catalog) => count + catalog.tools.length,
    0,
  );

  const setEffect = (
    catalogId: string,
    toolId: string,
    effect: PolicyEffectValue,
  ) => {
    if (selectedOrgUnit === null || updateToolPermission.isPending) return;
    if ((selectedPermissionByTool.get(toolId) ?? null) === effect) return;
    updateToolPermission.mutate({
      orgUnitId: selectedOrgUnit.id,
      catalogId,
      toolId,
      effect,
    });
  };

  return (
    <div className="flex h-full min-h-screen">
      <aside className="border-r-border-default flex w-[320px] shrink-0 flex-col border-r">
        <div className="border-b-border-default border-b px-5 py-4">
          <h1 className="text-text-primary text-lg font-semibold">
            ロール管理
          </h1>
          <p className="text-text-secondary mt-1 text-xs">
            部署別のMCPツール利用権限を設定
          </p>
        </div>

        <div className="border-b-border-default border-b px-4 py-3">
          <div className="relative">
            <Search
              size={12}
              className="text-text-muted absolute top-1/2 left-2.5 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="部署を検索"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="bg-bg-active border-border-default text-text-secondary w-full rounded-lg border py-1.5 pr-3 pl-7 text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {policyMatrixQuery.isLoading && (
            <div className="text-text-muted px-4 py-6 text-center text-xs">
              読み込み中...
            </div>
          )}
          {policyMatrixQuery.isError && (
            <div className="px-4 py-6 text-center text-xs text-red-300">
              データの取得に失敗しました
            </div>
          )}
          {!policyMatrixQuery.isLoading &&
            !policyMatrixQuery.isError &&
            orgUnits.length === 0 && (
              <div className="text-text-muted px-4 py-6 text-center text-xs">
                SCIM部署がまだ同期されていません
              </div>
            )}
          {!policyMatrixQuery.isLoading &&
            !policyMatrixQuery.isError &&
            orgUnits.length > 0 &&
            filteredOrgUnits.length === 0 && (
              <div className="text-text-muted px-4 py-6 text-center text-xs">
                該当する部署がありません
              </div>
            )}
          {filteredOrgUnits.map((orgUnit) => {
            const isSelected = selectedOrgUnit?.id === orgUnit.id;
            return (
              <button
                key={orgUnit.id}
                type="button"
                onClick={() => setSelectedOrgUnitId(orgUnit.id)}
                className={`border-b-border-subtle min-h-[44px] w-full border-b px-4 py-3 text-left text-xs transition-colors hover:bg-white/[0.02] ${
                  isSelected ? "bg-bg-active" : ""
                }`}
              >
                <div className="text-text-primary font-medium">
                  {orgUnit.name}
                </div>
                <div className="text-text-muted mt-1 truncate font-mono text-[10px]">
                  {orgUnit.path}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="border-b-border-default border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-text-primary text-base font-semibold">
                {selectedOrgUnit?.name ?? "部署を選択"}
              </h2>
              <p className="text-text-secondary mt-1 text-xs">
                {selectedOrgUnit?.path ??
                  "部署を選択するとMCPツール権限を編集できます"}
              </p>
            </div>
            <div className="text-text-muted text-right text-[11px]">
              <div>{orgUnits.length} 部署</div>
              <div>{toolCount} ツール</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {updateToolPermission.error && (
            <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-xs text-red-300">
              {updateToolPermission.error.message}
            </div>
          )}

          {selectedOrgUnit === null ? (
            <div className="text-text-muted flex h-full items-center justify-center text-sm">
              部署を選択してください
            </div>
          ) : catalogs.length === 0 ? (
            <div className="text-text-muted flex h-full items-center justify-center text-sm">
              MCPカタログがまだ登録されていません
            </div>
          ) : (
            <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
              <div className="border-b-border-default flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-text-primary text-xs font-semibold">
                  MCPツール権限
                </h3>
                <span className="text-text-subtle text-[10px]">
                  ALLOW / DENY / 未設定
                </span>
              </div>
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {catalogs.map((catalog) => (
                  <section key={catalog.id} className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-text-primary text-xs font-semibold">
                          {catalog.name}
                        </h4>
                        {catalog.description && (
                          <p className="text-text-muted mt-1 text-[10px]">
                            {catalog.description}
                          </p>
                        )}
                      </div>
                      <span className="text-text-subtle shrink-0 font-mono text-[10px]">
                        {catalog.tools.length} tools
                      </span>
                    </div>
                    {catalog.tools.length === 0 ? (
                      <div className="text-text-muted py-3 text-xs">
                        ツールが登録されていません
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {catalog.tools.map((tool) => {
                          const effect =
                            selectedPermissionByTool.get(tool.id) ?? null;
                          const isPending = updateToolPermission.isPending;
                          return (
                            <div
                              key={tool.id}
                              className="grid grid-cols-[1fr_154px] items-center gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-text-secondary truncate font-mono text-xs">
                                  {tool.name}
                                </div>
                                {tool.description && (
                                  <div className="text-text-muted mt-0.5 truncate text-[10px]">
                                    {tool.description}
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEffect(
                                      catalog.id,
                                      tool.id,
                                      PolicyEffect.ALLOW,
                                    )
                                  }
                                  disabled={isPending}
                                  className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 disabled:opacity-40 ${
                                    effect === PolicyEffect.ALLOW
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : "bg-bg-active text-text-muted"
                                  }`}
                                  title="許可"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEffect(
                                      catalog.id,
                                      tool.id,
                                      PolicyEffect.DENY,
                                    )
                                  }
                                  disabled={isPending}
                                  className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 disabled:opacity-40 ${
                                    effect === PolicyEffect.DENY
                                      ? "bg-red-500/20 text-red-300"
                                      : "bg-bg-active text-text-muted"
                                  }`}
                                  title="拒否"
                                >
                                  <X size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEffect(catalog.id, tool.id, null)
                                  }
                                  disabled={isPending}
                                  className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 disabled:opacity-40 ${
                                    effect === null
                                      ? "bg-bg-active text-text-secondary"
                                      : "bg-bg-active text-text-muted"
                                  }`}
                                  title="未設定"
                                >
                                  <Minus size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminRolesPage;
