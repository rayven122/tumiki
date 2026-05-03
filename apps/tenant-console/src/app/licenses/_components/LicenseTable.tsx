"use client";

import { useState, useCallback } from "react";
import { KeyRound } from "lucide-react";
import { api, type RouterOutputs } from "@/trpc/react";
import RevokeConfirmDialog from "./RevokeConfirmDialog";
import IssueLicenseDialog from "./IssueLicenseDialog";
import { licenseStatusBadgeClass } from "./licenseStyles";

type LicenseItem = RouterOutputs["license"]["list"]["items"][number];

type Props = {
  initialData: RouterOutputs["license"]["list"];
  tenants: Array<{ id: string; slug: string }>;
};

const typeBadgeClass = (type: "PERSONAL" | "TENANT") => {
  if (type === "PERSONAL") return "bg-badge-info-bg text-badge-info-text";
  return "bg-bg-active text-text-secondary";
};

const LicenseTable = ({ initialData, tenants }: Props) => {
  const [revokeTarget, setRevokeTarget] = useState<LicenseItem | null>(null);

  const {
    data,
    fetchNextPage,
    isFetchingNextPage,
    error: loadMoreError,
  } = api.license.list.useInfiniteQuery(
    {},
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialData: { pages: [initialData], pageParams: [undefined] },
    },
  );

  const items = data.pages.flatMap((page) => page.items);
  const hasMore = data.pages[data.pages.length - 1]?.hasMore ?? false;

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-text-primary text-lg font-semibold">
            ライセンス
          </h1>
          <p className="text-text-secondary mt-1 text-xs">
            発行済みライセンスと有効期限を管理します
          </p>
        </div>
        <IssueLicenseDialog tenants={tenants} />
      </div>

      {items.length === 0 ? (
        <div className="bg-bg-card border-border-default rounded-xl border py-14 text-center">
          <KeyRound className="text-text-subtle mx-auto mb-3 h-5 w-5" />
          <p className="text-text-muted text-sm">
            ライセンスがまだ存在しません
          </p>
        </div>
      ) : (
        <>
          <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <div className="border-b-border-default text-text-subtle grid min-w-[980px] grid-cols-[88px_1.4fr_1.2fr_96px_132px_132px_72px] items-center gap-3 border-b px-5 py-2.5 text-[10px]">
                <span>種別</span>
                <span>Subject</span>
                <span>Features</span>
                <span>ステータス</span>
                <span>有効期限</span>
                <span>発行日</span>
                <span className="text-right">操作</span>
              </div>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border-b-border-subtle hover:bg-bg-card-hover grid min-w-[980px] grid-cols-[88px_1.4fr_1.2fr_96px_132px_132px_72px] items-center gap-3 border-b px-5 py-3 text-xs transition-colors"
                >
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadgeClass(item.type)}`}
                  >
                    {item.type}
                  </span>
                  <span className="text-text-primary truncate font-mono">
                    {item.subject}
                  </span>
                  <span className="text-text-muted truncate">
                    {item.features.join(", ")}
                  </span>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${licenseStatusBadgeClass(item.computedStatus)}`}
                  >
                    {item.computedStatus}
                  </span>
                  <span className="text-text-muted font-mono text-[11px]">
                    {item.expiresAt.toLocaleDateString("ja-JP")}
                  </span>
                  <span className="text-text-muted font-mono text-[11px]">
                    {item.issuedAt.toLocaleDateString("ja-JP")}
                  </span>
                  <span className="text-right">
                    {item.computedStatus === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(item)}
                        className="text-badge-error-text hover:bg-badge-error-bg rounded px-2 py-1 text-[11px] transition-colors"
                      >
                        失効
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {hasMore && (
            <div className="mt-4 flex flex-col items-center gap-2">
              {loadMoreError && (
                <p className="text-badge-error-text text-sm">
                  追加データの読み込みに失敗しました。再度お試しください。
                </p>
              )}
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isFetchingNextPage}
                className="border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {isFetchingNextPage ? "読み込み中..." : "さらに読み込む"}
              </button>
            </div>
          )}
        </>
      )}

      {revokeTarget && (
        <RevokeConfirmDialog
          licenseId={revokeTarget.id}
          subject={revokeTarget.subject}
          onClose={() => setRevokeTarget(null)}
          onRevoked={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
};

export default LicenseTable;
