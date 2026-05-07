"use client";

import { useMemo, useState } from "react";
import {
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { api } from "~/trpc/react";

const transportTypes = ["STDIO", "SSE", "STREAMABLE_HTTP"] as const;
const authTypes = ["NONE", "API_KEY", "BEARER", "OAUTH"] as const;

type TransportType = (typeof transportTypes)[number];
type AuthType = (typeof authTypes)[number];

const authTypeLabels: Record<AuthType, string> = {
  NONE: "設定不要",
  API_KEY: "API Key",
  BEARER: "Bearer",
  OAUTH: "OAuth",
};

const authBadgeClass: Record<AuthType, string> = {
  NONE: "bg-emerald-500/15 text-emerald-300",
  API_KEY: "bg-amber-500/15 text-amber-300",
  BEARER: "bg-amber-500/15 text-amber-300",
  OAUTH: "bg-sky-500/15 text-sky-300",
};

const statusLabels = {
  ACTIVE: "利用可能",
  DISABLED: "利用不可",
} as const;

const previewStatusClass = {
  利用可能: "bg-emerald-500/15 text-emerald-300",
  申請が必要: "bg-amber-500/15 text-amber-300",
  利用不可: "bg-red-500/15 text-red-300",
} as const;

const desktopCatalogPreview = [
  {
    name: "GitHub",
    description: "Issue、Pull Request、Repository 操作を提供する標準コネクタ",
    authType: "OAUTH" as AuthType,
    status: "利用可能",
    tools: 18,
  },
  {
    name: "Google Drive",
    description: "Drive / Docs / Sheets の検索とファイル参照を提供",
    authType: "OAUTH" as AuthType,
    status: "申請が必要",
    tools: 12,
  },
  {
    name: "Internal API",
    description: "社内 API Key を使う管理者向けカスタムコネクタ",
    authType: "API_KEY" as AuthType,
    status: "利用不可",
    tools: 7,
  },
] as const;

const AdminToolsPage = () => {
  const utils = api.useUtils();
  const catalogsQuery = api.mcpCatalog.list.useQuery();
  const createCatalog = api.mcpCatalog.create.useMutation({
    onSuccess: async () => {
      await utils.mcpCatalog.list.invalidate();
      setName("");
      setSlug("");
      setDescription("");
    },
  });
  const updateCatalog = api.mcpCatalog.update.useMutation({
    onSuccess: async () => utils.mcpCatalog.list.invalidate(),
  });
  const deleteCatalog = api.mcpCatalog.delete.useMutation({
    onSuccess: async () => utils.mcpCatalog.list.invalidate(),
  });
  const refreshTools = api.mcpCatalog.refreshTools.useMutation({
    onSuccess: async () => {
      await utils.mcpCatalog.list.invalidate();
      setToolNames("");
    },
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [transportType, setTransportType] = useState<TransportType>("STDIO");
  const [authType, setAuthType] = useState<AuthType>("NONE");
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [toolNames, setToolNames] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const catalogs = catalogsQuery.data ?? [];
  const filteredCatalogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) return catalogs;
    return catalogs.filter((catalog) => {
      const searchable = [
        catalog.name,
        catalog.slug,
        catalog.description ?? "",
        catalog.transportType,
        catalog.authType,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [catalogs, query]);
  const selectedCatalog = useMemo(
    () => catalogs.find((catalog) => catalog.id === selectedCatalogId) ?? null,
    [catalogs, selectedCatalogId],
  );
  const mutationError =
    createCatalog.error ??
    updateCatalog.error ??
    deleteCatalog.error ??
    refreshTools.error;

  const handleCreate = () => {
    createCatalog.mutate({
      slug,
      name,
      description: description || undefined,
      transportType,
      authType,
      command: null,
      args: [],
      url: null,
      credentialKeys: [],
    });
  };

  const handleToggleStatus = (catalog: (typeof catalogs)[number]) => {
    if (updateCatalog.isPending) return;
    updateCatalog.mutate({
      id: catalog.id,
      name: catalog.name,
      description: catalog.description,
      transportType: catalog.transportType,
      authType: catalog.authType,
      status: catalog.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      iconPath: catalog.iconPath,
      command: catalog.command,
      args: catalog.args,
      url: catalog.url,
      credentialKeys: catalog.credentialKeys,
    });
  };

  const handleDeleteCatalog = () => {
    if (!selectedCatalog || deleteCatalog.isPending) return;
    setDeleteConfirmOpen(false);
    setSelectedCatalogId(null);
    deleteCatalog.mutate({ id: selectedCatalog.id });
  };

  const handleRefreshTools = () => {
    if (!selectedCatalog) return;
    const tools = toolNames
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [toolName, toolDescription] = line.split("|");
        const trimmedDescription = toolDescription?.trim();
        return {
          name: toolName?.trim() ?? "",
          description:
            trimmedDescription && trimmedDescription.length > 0
              ? trimmedDescription
              : undefined,
          inputSchema: {},
          defaultAllowed: false,
          riskLevel: "MEDIUM" as const,
        };
      })
      .filter((tool) => tool.name.length > 0);
    refreshTools.mutate({ catalogId: selectedCatalog.id, tools });
  };

  return (
    <div className="grid h-full min-h-screen grid-cols-[360px_1fr]">
      <aside className="border-r-border-default border-r p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-text-primary text-base font-semibold">
              コネクタカタログ管理
            </h1>
            <p className="text-text-secondary mt-1 text-xs">
              Desktop に配布する MCP カタログを管理
            </p>
          </div>
        </div>

        <div className="border-border-default bg-bg-card mb-4 rounded-lg border p-3">
          <div className="relative">
            <Search
              size={14}
              className="text-text-subtle absolute top-1/2 left-3 -translate-y-1/2"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="カタログを検索..."
              className="bg-bg-app border-border-default text-text-secondary w-full rounded-md border py-2 pr-3 pl-9 text-xs outline-none"
            />
          </div>
        </div>

        <div className="bg-bg-card border-border-default mb-4 space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-text-primary text-xs font-medium">
              カタログ追加
            </span>
            <span className="text-text-subtle text-[10px]">
              {catalogs.length}件
            </span>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="カタログ名"
            className="bg-bg-app border-border-default text-text-secondary w-full rounded-md border px-3 py-2 text-xs outline-none"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug"
            className="bg-bg-app border-border-default text-text-secondary w-full rounded-md border px-3 py-2 font-mono text-xs outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="説明"
            rows={3}
            className="bg-bg-app border-border-default text-text-secondary w-full resize-none rounded-md border px-3 py-2 text-xs outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={transportType}
              onChange={(e) =>
                setTransportType(e.target.value as TransportType)
              }
              className="bg-bg-app border-border-default text-text-secondary rounded-md border px-2 py-2 text-xs outline-none"
            >
              {transportTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <select
              value={authType}
              onChange={(e) => setAuthType(e.target.value as AuthType)}
              className="bg-bg-app border-border-default text-text-secondary rounded-md border px-2 py-2 text-xs outline-none"
            >
              {authTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name || !slug || createCatalog.isPending}
            className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium disabled:opacity-40"
          >
            <Plus size={13} />
            コネクタカタログを追加
          </button>
          {mutationError && (
            <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {mutationError.message}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {catalogsQuery.isLoading && (
            <div className="text-text-muted px-2 py-4 text-center text-xs">
              読み込み中...
            </div>
          )}
          {!catalogsQuery.isLoading && filteredCatalogs.length === 0 && (
            <div className="text-text-muted border-border-default rounded-lg border border-dashed px-3 py-8 text-center text-xs">
              {query.trim().length === 0
                ? "登録されているコネクタカタログはありません"
                : "条件に一致するカタログはありません"}
            </div>
          )}
          {filteredCatalogs.map((catalog) => (
            <button
              key={catalog.id}
              type="button"
              onClick={() => setSelectedCatalogId(catalog.id)}
              className={`border-border-default bg-bg-card min-h-[44px] w-full rounded-lg border p-3 text-left transition-colors hover:bg-white/[0.03] ${
                selectedCatalogId === catalog.id
                  ? "ring-text-primary ring-1"
                  : ""
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="bg-bg-active text-text-secondary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold">
                    MCP
                  </div>
                  <span className="text-text-primary truncate text-sm font-medium">
                    {catalog.name}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                    catalog.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {statusLabels[catalog.status]}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${authBadgeClass[catalog.authType]}`}
                >
                  {authTypeLabels[catalog.authType]}
                </span>
              </div>
              <div className="text-text-muted mt-2 truncate font-mono text-[10px]">
                {catalog.slug}
              </div>
              <div className="text-text-subtle mt-2 text-[10px]">
                提供ツール {catalog.tools.length}件 / {catalog.transportType}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="p-6">
        {selectedCatalog === null ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-text-primary text-lg font-semibold">
                Desktop カタログ表示プレビュー
              </h2>
              <p className="text-text-secondary mt-1 text-xs">
                管理者が有効化したコネクタカタログは、Desktop
                側で検索・認証方式・利用可否を見ながら追加します。
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {desktopCatalogPreview.map((catalog) => (
                <section
                  key={catalog.name}
                  className="bg-bg-card border-border-default flex min-h-[180px] flex-col rounded-xl border p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="bg-bg-active text-text-secondary flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-semibold">
                      MCP
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${authBadgeClass[catalog.authType]}`}
                    >
                      {authTypeLabels[catalog.authType]}
                    </span>
                  </div>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[9px] font-medium ${previewStatusClass[catalog.status]}`}
                  >
                    {catalog.status}
                  </span>
                  <div className="text-text-primary mt-3 text-sm font-semibold">
                    {catalog.name}
                  </div>
                  <p className="text-text-muted mt-2 line-clamp-2 text-[10px] leading-5">
                    {catalog.description}
                  </p>
                  <div className="text-text-subtle mt-auto pt-4 text-[10px]">
                    提供ツール {catalog.tools}件
                  </div>
                </section>
              ))}
            </div>

            <div className="bg-bg-card border-border-default rounded-xl border p-5">
              <h3 className="text-text-primary text-sm font-semibold">
                管理画面で確認する項目
              </h3>
              <div className="mt-4 grid gap-3 text-xs md:grid-cols-3">
                {[
                  ["配布状態", "Desktop に表示するか、利用不可にするか"],
                  ["認証方式", "OAuth / API Key / Bearer / 設定不要"],
                  ["提供ツール", "コネクタが公開する操作と初期許可"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="border-border-default bg-bg-app rounded-lg border p-3"
                  >
                    <div className="text-text-muted text-[10px]">{label}</div>
                    <div className="text-text-secondary mt-2">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-text-primary text-lg font-semibold">
                  {selectedCatalog.name}
                </h2>
                <p className="text-text-secondary mt-1 text-xs">
                  {selectedCatalog.description ??
                    "Desktop のカタログ画面に配布されるコネクタ定義です"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      selectedCatalog.status === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    {statusLabels[selectedCatalog.status]}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${authBadgeClass[selectedCatalog.authType]}`}
                  >
                    {authTypeLabels[selectedCatalog.authType]}
                  </span>
                  <span className="bg-bg-active text-text-secondary rounded-full px-2.5 py-1 text-[10px] font-medium">
                    {selectedCatalog.transportType}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedCatalog)}
                  disabled={updateCatalog.isPending}
                  className="bg-bg-active text-text-secondary flex min-h-[44px] items-center gap-1.5 rounded-md px-3 py-2 text-xs disabled:opacity-40"
                >
                  <Settings size={13} />
                  {selectedCatalog.status === "ACTIVE" ? "無効化" : "有効化"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleteCatalog.isPending}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300 disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  削除
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Desktop 表示",
                  value:
                    selectedCatalog.status === "ACTIVE"
                      ? "カタログに表示"
                      : "利用不可として表示",
                },
                {
                  label: "認証方式",
                  value: authTypeLabels[selectedCatalog.authType],
                },
                {
                  label: "提供ツール",
                  value: `${selectedCatalog.tools.length}件`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-bg-card border-border-default rounded-lg border p-4"
                >
                  <div className="text-text-muted text-[10px]">
                    {item.label}
                  </div>
                  <div className="text-text-primary mt-2 text-sm font-semibold">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-bg-card border-border-default rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-text-primary text-sm font-medium">
                  提供ツールの同期
                </h3>
                <button
                  type="button"
                  onClick={handleRefreshTools}
                  disabled={refreshTools.isPending || toolNames.trim() === ""}
                  className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] items-center gap-1.5 rounded-md px-3 py-2 text-xs disabled:opacity-40"
                >
                  <RefreshCw size={13} />
                  保存
                </button>
              </div>
              <textarea
                value={toolNames}
                onChange={(e) => setToolNames(e.target.value)}
                placeholder={
                  "list_repos|Repository list\ncreate_issue|Create issue"
                }
                rows={5}
                className="bg-bg-app border-border-default text-text-secondary w-full resize-none rounded-md border px-3 py-2 font-mono text-xs outline-none"
              />
              <p className="text-text-muted mt-2 text-[10px]">
                Desktop
                側では、このカタログをコネクタとして追加した後に提供ツール単位で許可状態を確認します。
              </p>
            </div>

            <div className="bg-bg-card border-border-default rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                <KeyRound size={14} className="text-text-muted" />
                <h3 className="text-text-primary text-sm font-medium">
                  接続テンプレート
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-text-muted text-[10px]">slug</div>
                  <div className="text-text-secondary mt-1 truncate font-mono">
                    {selectedCatalog.slug}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted text-[10px]">Transport</div>
                  <div className="text-text-secondary mt-1">
                    {selectedCatalog.transportType}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted text-[10px]">Credential</div>
                  <div className="text-text-secondary mt-1">
                    {selectedCatalog.credentialKeys.length === 0
                      ? "なし"
                      : `${selectedCatalog.credentialKeys.length} keys`}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-bg-card border-border-default overflow-hidden rounded-lg border">
              <div className="border-b-border-default text-text-subtle grid grid-cols-[1fr_110px_120px] border-b px-4 py-2 text-[10px]">
                <span>提供ツール</span>
                <span>リスク</span>
                <span>初期許可</span>
              </div>
              {selectedCatalog.tools.length === 0 && (
                <div className="text-text-muted px-4 py-8 text-center text-xs">
                  提供ツールが登録されていません
                </div>
              )}
              {selectedCatalog.tools.map((tool) => (
                <div
                  key={tool.id}
                  className="border-b-border-subtle grid grid-cols-[1fr_110px_120px] border-b px-4 py-3 text-xs"
                >
                  <div>
                    <div className="text-text-primary font-medium">
                      {tool.name}
                    </div>
                    <div className="text-text-muted mt-1">
                      {tool.description ?? ""}
                    </div>
                  </div>
                  <span className="text-text-secondary">{tool.riskLevel}</span>
                  <span className="text-text-secondary">
                    {tool.defaultAllowed ? "ALLOW" : "DENY"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      {deleteConfirmOpen && selectedCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-bg-card border-border-default w-full max-w-sm rounded-lg border p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-red-500/15 p-2 text-red-300">
                <Trash2 size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="text-text-primary text-sm font-semibold">
                  コネクタカタログを削除
                </h3>
                <p className="text-text-secondary mt-2 text-xs leading-5">
                  {selectedCatalog.name} を削除しますか？
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="bg-bg-active text-text-secondary min-h-[44px] rounded-md px-3 py-2 text-xs"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDeleteCatalog}
                disabled={deleteCatalog.isPending}
                className="min-h-[44px] rounded-md bg-red-500/20 px-3 py-2 text-xs font-medium text-red-200 disabled:opacity-40"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminToolsPage;
