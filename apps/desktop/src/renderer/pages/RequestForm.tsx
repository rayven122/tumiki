import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CURRENT_USER, TOOLS } from "../data/mock";

/** フォーム入力の共通スタイル */
const inputClass =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20";
const readonlyClass =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-zinc-500";
const labelClass = "text-sm text-zinc-300";

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
    <div className="min-h-screen space-y-6 bg-[#0a0a0a] p-6">
      {/* 戻るリンク */}
      <Link
        to="/requests"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white"
      >
        <ArrowLeft size={14} />
        権限申請
      </Link>

      <h1 className="text-xl font-semibold text-white">権限の利用申請</h1>

      {/* 申請者情報 */}
      <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#111] p-6">
        <h2 className="text-sm font-medium text-white">申請者情報</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelClass}>氏名</label>
            <input
              type="text"
              value={CURRENT_USER.name}
              readOnly
              className={readonlyClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>部署</label>
            <input
              type="text"
              value={CURRENT_USER.department}
              readOnly
              className={readonlyClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>ロール</label>
            <input
              type="text"
              value={CURRENT_USER.role}
              readOnly
              className={readonlyClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>社員ID</label>
            <input
              type="text"
              value={CURRENT_USER.employeeId}
              readOnly
              className={readonlyClass}
            />
          </div>
        </div>
      </div>

      {/* 申請内容 */}
      <div className="space-y-5 rounded-xl border border-white/[0.08] bg-[#111] p-6">
        <h2 className="text-sm font-medium text-white">申請内容</h2>

        {/* 申請種別 */}
        <div className="space-y-2">
          <label className={labelClass}>申請種別</label>
          <div className="flex gap-4">
            {[
              { value: "new" as const, label: "新規ツール利用" },
              { value: "add" as const, label: "既存ツールの権限追加" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"
              >
                <input
                  type="radio"
                  name="requestType"
                  checked={requestType === opt.value}
                  onChange={() => setRequestType(opt.value)}
                  className="accent-white"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* 対象ツール */}
        <div className="space-y-1.5">
          <label className={labelClass}>対象ツール</label>
          <select
            value={selectedTool}
            onChange={(e) => setSelectedTool(e.target.value)}
            className={inputClass}
          >
            <option value="" className="bg-[#111]">
              選択してください
            </option>
            {TOOLS.map((tool) => (
              <option key={tool.id} value={tool.id} className="bg-[#111]">
                {tool.name}
              </option>
            ))}
          </select>
        </div>

        {/* 希望する権限 */}
        <div className="space-y-2">
          <label className={labelClass}>希望する権限</label>
          <div className="flex gap-4">
            {(["read", "write", "execute"] as const).map((perm) => (
              <label
                key={perm}
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"
              >
                <input
                  type="checkbox"
                  checked={permissions[perm]}
                  onChange={() => togglePermission(perm)}
                  className="accent-white"
                />
                {perm.charAt(0).toUpperCase() + perm.slice(1)}
              </label>
            ))}
          </div>
        </div>

        {/* 利用目的 */}
        <div className="space-y-1.5">
          <label className={labelClass}>利用目的</label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={4}
            placeholder="利用目的を入力してください"
            className={inputClass}
          />
        </div>

        {/* 利用期間 */}
        <div className="space-y-2">
          <label className={labelClass}>利用期間</label>
          <div className="flex gap-4">
            {[
              { value: "unlimited" as const, label: "無期限" },
              { value: "limited" as const, label: "期間指定" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"
              >
                <input
                  type="radio"
                  name="periodType"
                  checked={periodType === opt.value}
                  onChange={() => setPeriodType(opt.value)}
                  className="accent-white"
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
                className={inputClass}
              />
              <span className="text-zinc-500">～</span>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      {/* 承認フロー */}
      <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#111] p-6">
        <h2 className="text-sm font-medium text-white">
          承認フロー（自動設定）
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-white/[0.05] px-3 py-1 text-zinc-400">
            1. 部門長承認
          </span>
          <span className="text-zinc-600">→</span>
          <span className="rounded-full bg-white/[0.05] px-3 py-1 text-zinc-400">
            2. 情報システム部承認
          </span>
          <span className="text-zinc-600">→</span>
          <span className="rounded-full bg-white/[0.05] px-3 py-1 text-zinc-400">
            3. 完了
          </span>
        </div>
      </div>

      {/* ボタン */}
      <div className="flex items-center gap-3">
        <button className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 hover:border-white/[0.15]">
          下書き保存
        </button>
        <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200">
          申請する
        </button>
      </div>
    </div>
  );
};
