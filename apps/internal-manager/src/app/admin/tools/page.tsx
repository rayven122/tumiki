"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw, Settings, Trash2 } from "lucide-react";
import { api } from "~/trpc/react";

const transportTypes = ["STDIO", "SSE", "STREAMABLE_HTTP"] as const;
const authTypes = ["NONE", "API_KEY", "BEARER", "OAUTH"] as const;

type TransportType = (typeof transportTypes)[number];
type AuthType = (typeof authTypes)[number];

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
  const [toolNames, setToolNames] = useState("");

  const catalogs = catalogsQuery.data ?? [];
  const selectedCatalog = useMemo(
    () => catalogs.find((catalog) => catalog.id === selectedCatalogId) ?? null,
    [catalogs, selectedCatalogId],
  );

  const handleCreate = () => {
    createCatalog.mutate({
      slug,
      name,
      description: description || undefined,
      transportType,
      authType,
      configTemplate: {},
      credentialKeys: [],
    });
  };

  const handleToggleStatus = (catalog: (typeof catalogs)[number]) => {
    updateCatalog.mutate({
      id: catalog.id,
      name: catalog.name,
      description: catalog.description,
      transportType: catalog.transportType,
      authType: catalog.authType,
      status: catalog.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      iconPath: catalog.iconPath,
      configTemplate:
        typeof catalog.configTemplate === "object" &&
        catalog.configTemplate !== null &&
        !Array.isArray(catalog.configTemplate)
          ? catalog.configTemplate
          : {},
      credentialKeys: catalog.credentialKeys,
    });
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
              MCPカタログ
            </h1>
            <p className="text-text-secondary mt-1 text-xs">
              {catalogs.length}件
            </p>
          </div>
        </div>

        <div className="bg-bg-card border-border-default mb-4 space-y-3 rounded-lg border p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="表示名"
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
            className="bg-btn-primary-bg text-btn-primary-text flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium disabled:opacity-40"
          >
            <Plus size={13} />
            追加
          </button>
        </div>

        <div className="space-y-2">
          {catalogsQuery.isLoading && (
            <div className="text-text-muted px-2 py-4 text-center text-xs">
              読み込み中...
            </div>
          )}
          {catalogs.map((catalog) => (
            <button
              key={catalog.id}
              type="button"
              onClick={() => setSelectedCatalogId(catalog.id)}
              className={`border-border-default bg-bg-card w-full rounded-lg border p-3 text-left transition-colors hover:bg-white/[0.03] ${
                selectedCatalogId === catalog.id
                  ? "ring-text-primary ring-1"
                  : ""
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-text-primary truncate text-sm font-medium">
                  {catalog.name}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] ${
                    catalog.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {catalog.status}
                </span>
              </div>
              <div className="text-text-muted truncate font-mono text-[10px]">
                {catalog.slug}
              </div>
              <div className="text-text-subtle mt-2 text-[10px]">
                {catalog.tools.length} tools / {catalog.transportType}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="p-6">
        {selectedCatalog === null ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-text-muted text-sm">
              MCPカタログを選択してください
            </span>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-text-primary text-lg font-semibold">
                  {selectedCatalog.name}
                </h2>
                <p className="text-text-secondary mt-1 text-xs">
                  {selectedCatalog.description ?? ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedCatalog)}
                  className="bg-bg-active text-text-secondary flex items-center gap-1.5 rounded-md px-3 py-2 text-xs"
                >
                  <Settings size={13} />
                  {selectedCatalog.status === "ACTIVE" ? "無効化" : "有効化"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    deleteCatalog.mutate({ id: selectedCatalog.id })
                  }
                  className="flex items-center gap-1.5 rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300"
                >
                  <Trash2 size={13} />
                  削除
                </button>
              </div>
            </div>

            <div className="bg-bg-card border-border-default rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-text-primary text-sm font-medium">
                  ツール同期
                </h3>
                <button
                  type="button"
                  onClick={handleRefreshTools}
                  disabled={refreshTools.isPending}
                  className="bg-btn-primary-bg text-btn-primary-text flex items-center gap-1.5 rounded-md px-3 py-2 text-xs disabled:opacity-40"
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
            </div>

            <div className="bg-bg-card border-border-default overflow-hidden rounded-lg border">
              <div className="border-b-border-default text-text-subtle grid grid-cols-[1fr_110px_120px] border-b px-4 py-2 text-[10px]">
                <span>ツール</span>
                <span>リスク</span>
                <span>初期許可</span>
              </div>
              {selectedCatalog.tools.length === 0 && (
                <div className="text-text-muted px-4 py-8 text-center text-xs">
                  ツールが登録されていません
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
    </div>
  );
};

export default AdminToolsPage;
