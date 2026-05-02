"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { type RouterOutputs } from "@/trpc/react";
import RevokeConfirmDialog from "./RevokeConfirmDialog";
import IssueLicenseDialog from "./IssueLicenseDialog";

type LicenseItem = RouterOutputs["license"]["list"]["items"][number];

type Props = {
  initialData: {
    items: LicenseItem[];
    nextCursor: string | undefined;
    hasMore: boolean;
  };
  tenants: Array<{ id: string; slug: string }>;
};

// computedStatus に応じたバッジのスタイルを返す
const statusBadgeClass = (status: "ACTIVE" | "REVOKED" | "EXPIRED") => {
  if (status === "ACTIVE") return "bg-green-100 text-green-800";
  if (status === "EXPIRED") return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

// type に応じたバッジのスタイルを返す
const typeBadgeClass = (type: "PERSONAL" | "TENANT") => {
  if (type === "PERSONAL") return "bg-blue-100 text-blue-800";
  return "bg-purple-100 text-purple-800";
};

const LicenseTable = ({ initialData, tenants }: Props) => {
  const router = useRouter();
  const [items, setItems] = useState<LicenseItem[]>(initialData.items);
  const [nextCursor, setNextCursor] = useState<string | undefined>(
    initialData.nextCursor,
  );
  const [hasMore, setHasMore] = useState(initialData.hasMore);

  // router.refresh() 後に RSC から新しい initialData が来たとき state を同期する
  useEffect(() => {
    setItems(initialData.items);
    setNextCursor(initialData.nextCursor);
    setHasMore(initialData.hasMore);
  }, [initialData]);

  // 失効確認ダイアログの表示対象
  const [revokeTarget, setRevokeTarget] = useState<LicenseItem | null>(null);

  const utils = api.useUtils();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  // cursor ベースの追加読み込み（list は query のため useUtils 経由で手動フェッチ）
  const handleLoadMore = useCallback(async () => {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const data = await utils.license.list.fetch({ cursor: nextCursor });
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setLoadMoreError(
        err instanceof Error ? err.message : "読み込みに失敗しました",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, utils.license.list]);

  const handleRevoked = useCallback(() => {
    setRevokeTarget(null);
    router.refresh();
  }, [router]);

  const handleIssueSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div>
      {/* ヘッダー行 */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ライセンス一覧</h1>
        <IssueLicenseDialog tenants={tenants} onSuccess={handleIssueSuccess} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <p className="text-gray-500">ライセンスがまだ存在しません</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg bg-white shadow">
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
                <p className="text-sm text-red-600">{loadMoreError}</p>
              )}
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={isLoadingMore}
                className="min-h-[44px] rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isLoadingMore ? "読み込み中..." : "さらに読み込む"}
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
          isOpen={true}
          onClose={() => setRevokeTarget(null)}
          onRevoked={handleRevoked}
        />
      )}
    </div>
  );
};

export default LicenseTable;
