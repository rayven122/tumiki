"use client";

import { useState, useCallback } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import RevokeConfirmDialog from "./RevokeConfirmDialog";
import IssueLicenseDialog from "./IssueLicenseDialog";

type LicenseItem = RouterOutputs["license"]["list"]["items"][number];

type Props = {
  initialData: RouterOutputs["license"]["list"];
  tenants: Array<{ id: string; slug: string }>;
};

const statusBadgeClass = (status: "ACTIVE" | "REVOKED" | "EXPIRED") => {
  if (status === "ACTIVE") return "bg-green-100 text-green-800";
  if (status === "EXPIRED") return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

const typeBadgeClass = (type: "PERSONAL" | "TENANT") => {
  if (type === "PERSONAL") return "bg-blue-100 text-blue-800";
  return "bg-purple-100 text-purple-800";
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
    <div>
      {/* ヘッダー行 */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ライセンス一覧</h1>
        <IssueLicenseDialog tenants={tenants} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <p className="text-gray-500">ライセンスがまだ存在しません</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    種別
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Features
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    有効期限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    発行日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${typeBadgeClass(item.type)}`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-900">
                      {item.subject}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {item.features.join(", ")}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${statusBadgeClass(item.computedStatus)}`}
                      >
                        {item.computedStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {item.expiresAt.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {item.issuedAt.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {item.computedStatus === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => setRevokeTarget(item)}
                          className="min-h-[44px] rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                          失効
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* さらに読み込むボタン */}
          {hasMore && (
            <div className="mt-4 flex flex-col items-center gap-2">
              {loadMoreError && (
                <p className="text-sm text-red-600">
                  追加データの読み込みに失敗しました。再度お試しください。
                </p>
              )}
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isFetchingNextPage}
                className="min-h-[44px] rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isFetchingNextPage ? "読み込み中..." : "さらに読み込む"}
              </button>
            </div>
          )}
        </>
      )}

      {/* 失効確認ダイアログ */}
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
