import type { JSX } from "react";
import { useState, useMemo } from "react";
import { X, Search } from "lucide-react";
import type { CatalogTool } from "../../types/catalog";

type CatalogToolsModalProps = {
  catalogName: string;
  tools: CatalogTool[];
  onClose: () => void;
};

export const CatalogToolsModal = ({
  catalogName,
  tools,
  onClose,
}: CatalogToolsModalProps): JSX.Element => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return tools;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [tools, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* タイトル + 閉じる */}
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {catalogName}の利用可能なツール
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-muted)] transition hover:opacity-70"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* サブタイトル */}
        <p className="mb-5 text-sm text-[var(--text-muted)]">
          このサーバーで利用できるツール一覧です。全{tools.length}
          件のツールがあります。
        </p>

        {/* 検索 */}
        <div className="relative mb-4">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-subtle)]"
          />
          <input
            type="text"
            placeholder="ツールを検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-2.5 pr-3 pl-9 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-subtle)]"
          />
        </div>

        {/* ツールリスト */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--text-subtle)]">
              条件に一致するツールが見つかりません
            </div>
          ) : (
            filtered.map((tool) => (
              <div
                key={tool.name}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-3"
              >
                <div className="mb-1 font-mono text-sm font-semibold text-[var(--text-primary)]">
                  {tool.name}
                </div>
                <div className="text-xs leading-relaxed text-[var(--text-muted)]">
                  {tool.description}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
