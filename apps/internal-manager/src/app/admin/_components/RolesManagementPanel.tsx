"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Search,
  Shield,
  ShieldX,
  X,
} from "lucide-react";
import { api, type RouterInputs } from "~/trpc/react";
import {
  countEffects,
  formatRolePermissionDate,
  getCatalogEffect,
  getToolEffect,
  type MatrixCatalog,
  type MatrixTool,
  type PermissionState,
} from "./roles-management-helpers";

type PolicyEffectInput =
  RouterInputs["mcpPolicies"]["updateToolPermission"]["effect"];
type ConcretePolicyEffect = NonNullable<PolicyEffectInput>;

type RolesManagementPanelProps = {
  initialOrgUnitId?: string;
};

type EffectControlProps = {
  label: string;
  value: PermissionState;
  disabled: boolean;
  onChange: (value: PermissionState) => void;
};

const effectOptions = [
  {
    value: "ALLOW" as const,
    label: "許可",
    icon: Check,
    activeClass: "bg-emerald-500/15 text-emerald-300",
  },
  {
    value: "DENY" as const,
    label: "拒否",
    icon: ShieldX,
    activeClass: "bg-red-500/15 text-red-300",
  },
  {
    value: null,
    label: "未設定",
    icon: X,
    activeClass: "bg-zinc-500/20 text-zinc-300",
  },
] satisfies {
  value: PermissionState;
  label: string;
  icon: typeof Check;
  activeClass: string;
}[];

const effectLabel = {
  ALLOW: "許可",
  DENY: "拒否",
} satisfies Record<ConcretePolicyEffect, string>;

export const RolesManagementPanel = ({
  initialOrgUnitId,
}: RolesManagementPanelProps) => {
  const utils = api.useUtils();
  const [search, setSearch] = useState("");
  const selectedOrgUnitId = initialOrgUnitId ?? null;
  const matrixQuery = api.mcpPolicies.getMatrix.useQuery({
    orgUnitId: selectedOrgUnitId,
  });
  const updateCatalogPermission =
    api.mcpPolicies.updateCatalogPermission.useMutation({
      onSuccess: async () => {
        await utils.mcpPolicies.getMatrix.invalidate({
          orgUnitId: selectedOrgUnitId,
        });
      },
    });
  const updateToolPermission = api.mcpPolicies.updateToolPermission.useMutation(
    {
      onSuccess: async () => {
        await utils.mcpPolicies.getMatrix.invalidate({
          orgUnitId: selectedOrgUnitId,
        });
      },
    },
  );
  const { reset: resetCatalogPermission } = updateCatalogPermission;
  const { reset: resetToolPermission } = updateToolPermission;

  useEffect(() => {
    resetCatalogPermission();
    resetToolPermission();
  }, [resetCatalogPermission, resetToolPermission, selectedOrgUnitId]);

  const orgUnits = matrixQuery.data?.orgUnits ?? [];
  const catalogs = matrixQuery.data?.catalogs ?? [];
  const selectedOrgUnit =
    orgUnits.find((orgUnit) => orgUnit.id === selectedOrgUnitId) ?? null;
  const isUnknownOrgUnit =
    Boolean(selectedOrgUnitId) && matrixQuery.isSuccess && !selectedOrgUnit;
  const isMutating =
    updateCatalogPermission.isPending || updateToolPermission.isPending;
  const mutationError =
    updateCatalogPermission.error ?? updateToolPermission.error;
  const counts = useMemo(() => countEffects(catalogs), [catalogs]);

  const filteredOrgUnits = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return orgUnits;
    return orgUnits.filter((orgUnit) =>
      [orgUnit.name, orgUnit.path, orgUnit.externalId ?? "", orgUnit.source]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [orgUnits, search]);

  const setCatalogEffect = (
    catalog: MatrixCatalog,
    effect: PermissionState,
  ) => {
    if (!selectedOrgUnitId || isMutating) return;
    updateToolPermission.reset();
    updateCatalogPermission.mutate({
      orgUnitId: selectedOrgUnitId,
      catalogId: catalog.id,
      effect,
    });
  };

  const setToolEffect = (
    catalog: MatrixCatalog,
    tool: MatrixTool,
    effect: PermissionState,
  ) => {
    if (!selectedOrgUnitId || isMutating) return;
    updateCatalogPermission.reset();
    updateToolPermission.mutate({
      orgUnitId: selectedOrgUnitId,
      catalogId: catalog.id,
      toolId: tool.id,
      effect,
    });
  };

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="border-b-border-default shrink-0 border-b px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-text-primary flex items-center gap-2 text-lg font-semibold">
              <Shield size={18} />
              部署別 MCP 権限
            </h1>
            <p className="text-text-secondary mt-1 text-xs">
              部署ごとに MCP
              カタログとツールの許可・拒否を実データへ保存します。
            </p>
          </div>
          {selectedOrgUnit ? (
            <Link
              href="/admin/roles"
              className="bg-bg-active text-text-secondary hover:text-text-primary flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium"
            >
              <ArrowLeft size={13} />
              部署一覧へ
            </Link>
          ) : null}
        </div>
      </header>

      <main className="grid flex-1 overflow-hidden lg:grid-cols-[360px_1fr]">
        <aside className="border-r-border-default overflow-y-auto border-r p-5">
          <div className="mb-4">
            <div className="relative">
              <Search
                size={13}
                className="text-text-muted absolute top-1/2 left-2.5 -translate-y-1/2"
              />
              <input
                type="text"
                aria-label="部署検索"
                placeholder="部署名・path で検索"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-bg-active border-border-default text-text-secondary w-full rounded-lg border py-2 pr-3 pl-8 text-xs outline-none"
              />
            </div>
          </div>

          <div className="text-text-muted mb-2 flex items-center justify-between text-[11px]">
            <span>部署</span>
            <span>{filteredOrgUnits.length} 件</span>
          </div>

          <section
            aria-label="部署一覧"
            className="bg-bg-card border-border-default overflow-hidden rounded-lg border"
          >
            {matrixQuery.isLoading ? (
              <div className="text-text-muted flex items-center justify-center gap-2 px-5 py-10 text-xs">
                <Loader2 size={14} className="animate-spin" />
                読み込み中
              </div>
            ) : filteredOrgUnits.length === 0 ? (
              <div className="text-text-muted px-5 py-10 text-center text-xs">
                条件に一致する部署はありません
              </div>
            ) : (
              filteredOrgUnits.map((orgUnit) => {
                const isSelected = orgUnit.id === selectedOrgUnitId;
                return (
                  <Link
                    key={orgUnit.id}
                    href={`/admin/roles/${orgUnit.id}`}
                    aria-current={isSelected ? "page" : undefined}
                    className={`border-b-border-subtle block border-b px-4 py-3 text-xs transition-colors last:border-b-0 ${
                      isSelected ? "bg-bg-active" : "hover:bg-bg-card-hover"
                    }`}
                  >
                    <div className="text-text-primary truncate font-medium">
                      {orgUnit.name}
                    </div>
                    <div className="text-text-muted mt-1 truncate font-mono text-[10px]">
                      {orgUnit.path}
                    </div>
                    <div className="text-text-subtle mt-1 text-[10px]">
                      {orgUnit.source} / {orgUnit.externalId ?? "-"}
                    </div>
                  </Link>
                );
              })
            )}
          </section>
        </aside>

        <section className="overflow-y-auto p-6">
          {matrixQuery.isError ? (
            <div className="border-border-default bg-bg-card text-text-secondary rounded-lg border px-5 py-8 text-sm">
              権限情報の読み込みに失敗しました。時間をおいて再試行してください。
            </div>
          ) : isUnknownOrgUnit ? (
            <div className="border-border-default bg-bg-card rounded-lg border px-5 py-8">
              <h2 className="text-text-primary text-base font-semibold">
                部署が見つかりません
              </h2>
              <p className="text-text-secondary mt-2 text-xs">
                指定された部署 ID は現在の組織データに存在しません。
              </p>
              <Link
                href="/admin/roles"
                className="bg-btn-primary-bg text-btn-primary-text mt-4 inline-flex min-h-[44px] items-center rounded-lg px-3 text-xs font-medium"
              >
                部署一覧へ戻る
              </Link>
            </div>
          ) : selectedOrgUnitId && matrixQuery.isLoading ? (
            <div className="border-border-default bg-bg-card text-text-muted flex items-center gap-2 rounded-lg border px-5 py-8 text-xs">
              <Loader2 size={14} className="animate-spin" />
              部署権限を読み込み中
            </div>
          ) : !selectedOrgUnit ? (
            <div className="border-border-default bg-bg-card rounded-lg border px-5 py-8">
              <h2 className="text-text-primary text-base font-semibold">
                部署を選択してください
              </h2>
              <p className="text-text-secondary mt-2 text-xs">
                左の部署一覧から対象を選ぶと、実データに保存されている MCP
                権限を編集できます。
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="border-border-default bg-bg-card rounded-lg border p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-text-primary text-base font-semibold">
                      {selectedOrgUnit.name}
                    </h2>
                    <p className="text-text-muted mt-1 font-mono text-[11px]">
                      {selectedOrgUnit.path}
                    </p>
                    <p className="text-text-subtle mt-1 text-[10px]">
                      source: {selectedOrgUnit.source} / externalId:{" "}
                      {selectedOrgUnit.externalId ?? "-"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="bg-bg-active rounded-lg px-3 py-2">
                      <span className="text-text-muted">カタログ許可 </span>
                      <span className="text-text-primary font-medium">
                        {counts.catalogAllow}
                      </span>
                    </div>
                    <div className="bg-bg-active rounded-lg px-3 py-2">
                      <span className="text-text-muted">カタログ拒否 </span>
                      <span className="text-text-primary font-medium">
                        {counts.catalogDeny}
                      </span>
                    </div>
                    <div className="bg-bg-active rounded-lg px-3 py-2">
                      <span className="text-text-muted">ツール許可 </span>
                      <span className="text-text-primary font-medium">
                        {counts.toolAllow}
                      </span>
                    </div>
                    <div className="bg-bg-active rounded-lg px-3 py-2">
                      <span className="text-text-muted">ツール拒否 </span>
                      <span className="text-text-primary font-medium">
                        {counts.toolDeny}
                      </span>
                    </div>
                  </div>
                  {isMutating ? (
                    <div className="text-text-muted flex items-center gap-1.5 text-xs">
                      <Loader2 size={12} className="animate-spin" />
                      保存中...
                    </div>
                  ) : null}
                </div>
                {mutationError ? (
                  <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    <span>
                      保存に失敗しました。時間をおいて再試行してください。
                    </span>
                    <button
                      type="button"
                      aria-label="保存エラーを閉じる"
                      onClick={() => {
                        updateCatalogPermission.reset();
                        updateToolPermission.reset();
                      }}
                      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md opacity-70 hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                {catalogs.length === 0 ? (
                  <div className="border-border-default bg-bg-card text-text-muted rounded-lg border px-5 py-10 text-center text-xs">
                    MCP カタログが登録されていません
                  </div>
                ) : (
                  catalogs.map((catalog) => {
                    const catalogEffect = getCatalogEffect(catalog);
                    return (
                      <section
                        key={catalog.id}
                        className="bg-bg-card border-border-default overflow-hidden rounded-lg border"
                      >
                        <div className="border-b-border-default flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                          <div className="min-w-0">
                            <div className="text-text-primary font-medium">
                              {catalog.name}
                            </div>
                            <div className="text-text-muted mt-1 font-mono text-[10px]">
                              {catalog.slug} / {catalog.status} / 更新{" "}
                              {formatRolePermissionDate(catalog.updatedAt)}
                            </div>
                          </div>
                          <EffectControl
                            label={`${catalog.name} のカタログ権限`}
                            value={catalogEffect}
                            disabled={isMutating}
                            onChange={(effect) =>
                              setCatalogEffect(catalog, effect)
                            }
                          />
                        </div>

                        <div className="border-b-border-default text-text-subtle hidden grid-cols-[1fr_96px_150px] items-center gap-3 border-b px-5 py-3 text-[10px] sm:grid">
                          <span>ツール</span>
                          <span>初期許可</span>
                          <span className="text-right">部署権限</span>
                        </div>
                        {catalog.tools.length === 0 ? (
                          <div className="text-text-muted px-5 py-6 text-center text-xs">
                            このカタログにツールはありません
                          </div>
                        ) : (
                          catalog.tools.map((tool) => {
                            const toolEffect = getToolEffect(tool);
                            return (
                              <div
                                key={tool.id}
                                className="border-b-border-subtle grid grid-cols-[1fr_auto] items-center gap-3 border-b px-5 py-4 text-xs last:border-b-0 sm:grid-cols-[1fr_96px_150px]"
                              >
                                <div className="min-w-0">
                                  <div className="text-text-primary truncate font-medium">
                                    {tool.name}
                                  </div>
                                  <div className="text-text-muted mt-1 text-[10px]">
                                    更新{" "}
                                    {formatRolePermissionDate(tool.updatedAt)}
                                  </div>
                                </div>
                                <span
                                  className={`w-fit rounded-full px-2 py-0.5 text-[10px] ${
                                    tool.defaultAllowed
                                      ? "bg-emerald-500/15 text-emerald-300"
                                      : "bg-zinc-500/20 text-zinc-300"
                                  }`}
                                >
                                  {tool.defaultAllowed ? "許可" : "未許可"}
                                </span>
                                <div className="col-span-2 flex justify-end sm:col-span-1">
                                  <EffectControl
                                    label={`${tool.name} のツール権限`}
                                    value={toolEffect}
                                    disabled={isMutating}
                                    onChange={(effect) =>
                                      setToolEffect(catalog, tool, effect)
                                    }
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </section>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const EffectControl = ({
  label,
  value,
  disabled,
  onChange,
}: EffectControlProps) => (
  <div
    className="flex gap-1"
    role="group"
    aria-label={label}
    aria-disabled={disabled}
  >
    {effectOptions.map((option) => {
      const Icon = option.icon;
      const isActive = value === option.value;
      const title =
        option.value === null ? "未設定" : `${effectLabel[option.value]}に設定`;
      return (
        <button
          key={option.value ?? "unset"}
          type="button"
          disabled={disabled}
          aria-pressed={isActive}
          aria-label={`${label}: ${option.label}`}
          title={title}
          onClick={() => onChange(option.value)}
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${
            isActive
              ? option.activeClass
              : "bg-bg-active text-text-muted opacity-60 hover:opacity-100"
          }`}
        >
          <Icon size={13} />
        </button>
      );
    })}
  </div>
);
