import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CURRENT_USER, TOOLS } from "../data/mock";

/** フォーム入力の共通クラス */
const inputClass =
  "border border-gray-200 dark:border-white/[.08] bg-black/[.02] dark:bg-white/[.03] text-gray-900 dark:text-white";

const readonlyClass =
  "border border-gray-200 dark:border-white/[.08] bg-black/[.02] dark:bg-white/[.04] text-gray-500 dark:text-zinc-500";

/** セクション区切り */
const sectionBorderClass = "border-t border-t-gray-200 dark:border-t-white/[.08]";

// 権限申請フォームページ
export const RequestForm = (): JSX.Element => {
  const [requestType, setRequestType] = useState<"new" | "add">("new");
  const [selectedTool, setSelectedTool] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    read: false,
    write: false,
    execute: false,
  });
  const [purpose, setPurpose] = useState("");
  const [periodType, setPeriodType] = useState<"unlimited" | "limited">(
    "unlimited",
  );
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  /** チェックボックスのトグル */
  const togglePermission = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4 p-6">
      {/* 戻るリンク */}
      <Link
        to="/requests"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:opacity-80"
      >
        <ArrowLeft size={14} />
        権限申請
      </Link>

      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
        権限の利用申請
      </h1>

      {/* 統合カード */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[.08] bg-white dark:bg-zinc-900">
        {/* 申請者情報セクション */}
        <div className="space-y-4 p-6">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">
            申請者情報
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 dark:text-zinc-500">氏名</label>
              <input
                type="text"
                value={CURRENT_USER.name}
                readOnly
                className={`w-full rounded-lg px-3 py-2 text-sm ${readonlyClass}`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 dark:text-zinc-500">部署</label>
              <input
                type="text"
                value={CURRENT_USER.department}
                readOnly
                className={`w-full rounded-lg px-3 py-2 text-sm ${readonlyClass}`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 dark:text-zinc-500">ロール</label>
              <input
                type="text"
                value={CURRENT_USER.role}
                readOnly
                className={`w-full rounded-lg px-3 py-2 text-sm ${readonlyClass}`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 dark:text-zinc-500">社員ID</label>
              <input
                type="text"
                value={CURRENT_USER.employeeId}
                readOnly
                className={`w-full rounded-lg px-3 py-2 text-sm ${readonlyClass}`}
              />
            </div>
          </div>
        </div>

        {/* 申請内容セクション */}
        <div className={`space-y-5 p-6 ${sectionBorderClass}`}>
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">
            申請内容
          </h2>

          {/* 申請種別 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 dark:text-zinc-500">申請種別</label>
            <div className="flex gap-4">
              {[
                { value: "new" as const, label: "新規ツール利用" },
                { value: "add" as const, label: "既存ツールの権限追加" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-zinc-400"
                >
                  <input
                    type="radio"
                    name="requestType"
                    checked={requestType === opt.value}
                    onChange={() => setRequestType(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* 対象ツール */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 dark:text-zinc-500">
              対象ツール
            </label>
            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${inputClass}`}
            >
              <option value="">選択してください</option>
              {TOOLS.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.name}
                </option>
              ))}
            </select>
          </div>

          {/* 希望する権限 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 dark:text-zinc-500">
              希望する権限
            </label>
            <div className="flex gap-4">
              {(["read", "write", "execute"] as const).map((perm) => (
                <label
                  key={perm}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-zinc-400"
                >
                  <input
                    type="checkbox"
                    checked={permissions[perm]}
                    onChange={() => togglePermission(perm)}
                  />
                  {perm.charAt(0).toUpperCase() + perm.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* 利用目的 */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 dark:text-zinc-500">利用目的</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={4}
              placeholder="利用目的を入力してください"
              className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${inputClass}`}
            />
          </div>

          {/* 利用期間 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 dark:text-zinc-500">利用期間</label>
            <div className="flex gap-4">
              {[
                { value: "unlimited" as const, label: "無期限" },
                { value: "limited" as const, label: "期間指定" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-zinc-400"
                >
                  <input
                    type="radio"
                    name="periodType"
                    checked={periodType === opt.value}
                    onChange={() => setPeriodType(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {periodType === "limited" && (
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${inputClass}`}
                />
                <span className="text-gray-500 dark:text-zinc-500">~</span>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${inputClass}`}
                />
              </div>
            )}
          </div>
        </div>

        {/* 承認フローセクション */}
        <div className={`space-y-3 p-6 ${sectionBorderClass}`}>
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">
            承認フロー（自動設定）
          </h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-black/[.02] dark:bg-white/[.04] px-3 py-1 text-gray-600 dark:text-zinc-400">
              1. 部門長承認
            </span>
            <span className="text-gray-400 dark:text-zinc-600">→</span>
            <span className="rounded-full bg-black/[.02] dark:bg-white/[.04] px-3 py-1 text-gray-600 dark:text-zinc-400">
              2. 情報システム部承認
            </span>
            <span className="text-gray-400 dark:text-zinc-600">→</span>
            <span className="rounded-full bg-black/[.02] dark:bg-white/[.04] px-3 py-1 text-gray-600 dark:text-zinc-400">
              3. 完了
            </span>
          </div>
        </div>
      </div>

      {/* ボタン */}
      <div className="flex items-center gap-3">
        <button className="rounded-lg border border-gray-200 dark:border-white/[.08] px-4 py-2 text-sm text-gray-600 dark:text-zinc-400 transition-colors hover:opacity-90">
          下書き保存
        </button>
        <button className="rounded-lg bg-gray-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black transition-colors hover:opacity-90">
          申請する
        </button>
      </div>
    </div>
  );
};
