import type { CSSProperties, JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CURRENT_USER, TOOLS } from "../data/mock";

/** フォーム入力の共通スタイル */
const inputStyle: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border)",
  backgroundColor: "var(--bg-input)",
  color: "var(--text-primary)",
};

const readonlyStyle: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border)",
  backgroundColor: "var(--bg-card-hover)",
  color: "var(--text-muted)",
};

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
    <div
      className="min-h-screen space-y-6 p-6"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* 戻るリンク */}
      <Link
        to="/requests"
        className="inline-flex items-center gap-1.5 text-sm hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} />
        権限申請
      </Link>

      <h1
        className="text-xl font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        権限の利用申請
      </h1>

      {/* 申請者情報 */}
      <div
        className="space-y-4 rounded-xl p-6"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          申請者情報
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              氏名
            </label>
            <input
              type="text"
              value={CURRENT_USER.name}
              readOnly
              className="w-full rounded-lg px-4 py-2.5 text-sm"
              style={readonlyStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              部署
            </label>
            <input
              type="text"
              value={CURRENT_USER.department}
              readOnly
              className="w-full rounded-lg px-4 py-2.5 text-sm"
              style={readonlyStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              ロール
            </label>
            <input
              type="text"
              value={CURRENT_USER.role}
              readOnly
              className="w-full rounded-lg px-4 py-2.5 text-sm"
              style={readonlyStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              社員ID
            </label>
            <input
              type="text"
              value={CURRENT_USER.employeeId}
              readOnly
              className="w-full rounded-lg px-4 py-2.5 text-sm"
              style={readonlyStyle}
            />
          </div>
        </div>
      </div>

      {/* 申請内容 */}
      <div
        className="space-y-5 rounded-xl p-6"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          申請内容
        </h2>

        {/* 申請種別 */}
        <div className="space-y-2">
          <label className="text-sm" style={{ color: "var(--text-secondary)" }}>
            申請種別
          </label>
          <div className="flex gap-4">
            {[
              { value: "new" as const, label: "新規ツール利用" },
              { value: "add" as const, label: "既存ツールの権限追加" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
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
          <label className="text-sm" style={{ color: "var(--text-secondary)" }}>
            対象ツール
          </label>
          <select
            value={selectedTool}
            onChange={(e) => setSelectedTool(e.target.value)}
            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/20"
            style={inputStyle}
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
          <label className="text-sm" style={{ color: "var(--text-secondary)" }}>
            希望する権限
          </label>
          <div className="flex gap-4">
            {(["read", "write", "execute"] as const).map((perm) => (
              <label
                key={perm}
                className="flex cursor-pointer items-center gap-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
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
          <label className="text-sm" style={{ color: "var(--text-secondary)" }}>
            利用目的
          </label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={4}
            placeholder="利用目的を入力してください"
            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/20"
            style={inputStyle}
          />
        </div>

        {/* 利用期間 */}
        <div className="space-y-2">
          <label className="text-sm" style={{ color: "var(--text-secondary)" }}>
            利用期間
          </label>
          <div className="flex gap-4">
            {[
              { value: "unlimited" as const, label: "無期限" },
              { value: "limited" as const, label: "期間指定" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
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
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/20"
                style={inputStyle}
              />
              <span style={{ color: "var(--text-muted)" }}>～</span>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/20"
                style={inputStyle}
              />
            </div>
          )}
        </div>
      </div>

      {/* 承認フロー */}
      <div
        className="space-y-3 rounded-xl p-6"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          承認フロー（自動設定）
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <span
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: "var(--bg-card-hover)",
              color: "var(--text-secondary)",
            }}
          >
            1. 部門長承認
          </span>
          <span style={{ color: "var(--text-subtle)" }}>→</span>
          <span
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: "var(--bg-card-hover)",
              color: "var(--text-secondary)",
            }}
          >
            2. 情報システム部承認
          </span>
          <span style={{ color: "var(--text-subtle)" }}>→</span>
          <span
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: "var(--bg-card-hover)",
              color: "var(--text-secondary)",
            }}
          >
            3. 完了
          </span>
        </div>
      </div>

      {/* ボタン */}
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg px-4 py-2 text-sm hover:opacity-90"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          下書き保存
        </button>
        <button
          className="rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
          style={{
            backgroundColor: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
          }}
        >
          申請する
        </button>
      </div>
    </div>
  );
};
