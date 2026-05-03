"use client";

import { useCallback, useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import RevokeConfirmDialog from "@/app/licenses/_components/RevokeConfirmDialog";
import IssueLicenseDialog from "@/app/licenses/_components/IssueLicenseDialog";

type LicenseItem = RouterOutputs["license"]["list"]["items"][number];

type Props = {
  tenantId: string;
  tenantSlug: string;
  initialData: RouterOutputs["license"]["list"];
};

const statusBadgeClass = (status: "ACTIVE" | "REVOKED" | "EXPIRED") => {
  if (status === "ACTIVE") return "bg-badge-success-bg text-badge-success-text";
  if (status === "EXPIRED") return "bg-badge-warn-bg text-badge-warn-text";
  return "bg-badge-error-bg text-badge-error-text";
};

const TenantLicenseTab = ({ tenantId, tenantSlug, initialData }: Props) => {
  const [revokeTarget, setRevokeTarget] = useState<LicenseItem | null>(null);

  const {
    data,
    fetchNextPage,
    isFetchingNextPage,
    error: loadMoreError,
  } = api.license.list.useInfiniteQuery(
    { tenantId },
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
      <div className="mb-4 flex justify-end">
        <IssueLicenseDialog
          tenants={[{ id: tenantId, slug: tenantSlug }]}
          defaultTenantId={tenantId}
        />
      </div>

      {items.length === 0 ? (
        <div className="bg-bg-card border-border-default rounded-xl border py-12 text-center">
          <p className="text-text-muted text-sm">
            このテナントにライセンスはまだありません
          </p>
        </div>
      ) : (
        <>
          <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <div className="border-b-border-default text-text-subtle grid min-w-[720px] grid-cols-[1.5fr_96px_132px_132px_72px] items-center gap-3 border-b px-5 py-2.5 text-[10px]">
                <span>Features</span>
                <span>ステータス</span>
                <span>有効期限</span>
                <span>発行日</span>
                <span className="text-right">操作</span>
              </div>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border-b-border-subtle hover:bg-bg-card-hover grid min-w-[720px] grid-cols-[1.5fr_96px_132px_132px_72px] items-center gap-3 border-b px-5 py-3 text-xs transition-colors"
                >
                  <span className="text-text-muted truncate">
                    {item.features.join(", ")}
                  </span>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(item.computedStatus)}`}
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

export default TenantLicenseTab;
