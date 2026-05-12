import { type JSX, useState } from "react";
import { ORG_USERS, ROLE_DEFINITIONS, SERVICES } from "../../data/admin-mock";
import type { UserRole } from "../../data/admin-mock";

/** イニシャルアバター用ラベル */
const INITIALS = ["A", "B", "C", "D", "E"] as const;

/** ロール追加用のカラーパレット */
const ROLE_COLORS = [
  "#34d399",
  "#60a5fa",
  "#a78bfa",
  "#fbbf24",
  "#f87171",
  "#fb923c",
  "#2dd4bf",
] as const;

/* ===== モーダル共通オーバーレイ ===== */
const ModalOverlay = ({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    onClick={onClose}
  >
    <div
      className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/[.08] dark:bg-zinc-900"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

/* ===== ロール追加モーダル ===== */
const AddRoleModal = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(ROLE_COLORS[4]);

  return (
    <ModalOverlay onClose={onClose}>
      <h3
        className="mb-5 text-sm font-semibold text-gray-900 dark:text-white"
      >
        ロール追加
      </h3>

      {/* ロール名 */}
      <div className="mb-4">
        <label
          className="mb-1.5 block text-[11px] font-medium text-gray-500 dark:text-zinc-500"
        >
          ロール名
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: Viewer"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none dark:border-white/[.08] dark:bg-white/[.04] dark:text-white"
        />
      </div>

      {/* 説明 */}
      <div className="mb-4">
        <label
          className="mb-1.5 block text-[11px] font-medium text-gray-500 dark:text-zinc-500"
        >
          説明
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例: 閲覧のみ可能なロール"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none dark:border-white/[.08] dark:bg-white/[.04] dark:text-white"
        />
      </div>

      {/* カラー選択 */}
      <div className="mb-6">
        <label
          className="mb-1.5 block text-[11px] font-medium text-gray-500 dark:text-zinc-500"
        >
          カラー
        </label>
        <div className="flex gap-2">
          {ROLE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className="h-6 w-6 rounded-full transition-all"
              style={{
                backgroundColor: color,
                outline:
                  selectedColor === color
                    ? `2px solid ${color}`
                    : "2px solid transparent",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
      </div>

      {/* アクション */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600 transition-colors dark:border-white/[.08] dark:bg-white/[.04] dark:text-zinc-400"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-xs font-medium transition-colors"
          style={{
            backgroundColor: selectedColor,
            color: "#000",
          }}
        >
          作成
        </button>
      </div>
    </ModalOverlay>
  );
};

/* ===== メンバー編集モーダル ===== */
const EditMembersModal = ({
  roleName,
  roleColor,
  onClose,
}: {
  roleName: UserRole;
  roleColor: string;
  onClose: () => void;
}) => {
  // 全ユーザーに対して、このロールに所属しているかの状態
  const [members, setMembers] = useState<Set<string>>(
    new Set(ORG_USERS.filter((u) => u.role === roleName).map((u) => u.id)),
  );

  const toggleMember = (id: string) => {
    setMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="mb-5 flex items-center gap-2">
        <span
          className="inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-semibold"
          style={{
            backgroundColor: `${roleColor}18`,
            color: roleColor,
          }}
        >
          {roleName}
        </span>
        <h3
          className="text-sm font-semibold text-gray-900 dark:text-white"
        >
          メンバー編集
        </h3>
      </div>

      {/* メンバーリスト */}
      <div
        className="max-h-[320px] space-y-1 overflow-y-auto rounded-xl border border-gray-200 bg-black/[.01] p-2 dark:border-white/[.08] dark:bg-white/[.02]"
      >
        {ORG_USERS.map((user) => {
          const isMember = members.has(user.id);
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => toggleMember(user.id)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors"
              style={{
                backgroundColor: isMember ? `${roleColor}08` : "transparent",
              }}
            >
              {/* アバター */}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isMember ? "" : "bg-gray-200 dark:bg-zinc-700"}`}
                style={isMember ? { backgroundColor: `${roleColor}20` } : undefined}
              >
                <span
                  className={`text-[10px] font-semibold ${isMember ? "" : "text-gray-600 dark:text-zinc-400"}`}
                  style={isMember ? { color: roleColor } : undefined}
                >
                  {user.name.charAt(0)}
                </span>
              </div>

              {/* ユーザー情報 */}
              <div className="flex-1 text-left">
                <div
                  className="text-xs font-medium text-gray-900 dark:text-white"
                >
                  {user.name}
                </div>
                <div
                  className="text-[10px] text-gray-500 dark:text-zinc-500"
                >
                  {user.department}
                </div>
              </div>

              {/* 現在のロール */}
              <span
                className="text-[9px] text-gray-500 dark:text-zinc-500"
              >
                {user.role}
              </span>

              {/* チェック */}
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${isMember ? "" : "border border-gray-200 dark:border-white/[.08]"}`}
                style={isMember ? { backgroundColor: roleColor } : undefined}
              >
                {isMember && <span className="text-[10px] text-black">✓</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* 選択数 */}
      <div className="mt-3 text-[11px] text-gray-500 dark:text-zinc-500">
        {members.size}名 選択中
      </div>

      {/* アクション */}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600 transition-colors dark:border-white/[.08] dark:bg-white/[.04] dark:text-zinc-400"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-xs font-medium transition-colors"
          style={{
            backgroundColor: roleColor,
            color: "#000",
          }}
        >
          保存
        </button>
      </div>
    </ModalOverlay>
  );
};

/** トグルスイッチ */
const Toggle = ({
  on,
  color,
  partial,
  onClick,
}: {
  on: boolean;
  color?: string;
  partial?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="relative h-3.5 w-6 shrink-0 cursor-pointer rounded-full transition-colors duration-300"
    style={{
      backgroundColor: on
        ? (color ?? "#34d399")
        : partial
          ? "#f59e0b"
          : "rgba(156,163,175,0.3)",
    }}
  >
    <div
      className="absolute top-[1px] h-[12px] w-[12px] rounded-full bg-white shadow-sm transition-all duration-300"
      style={{
        right: on || partial ? "1px" : "auto",
        left: on || partial ? "auto" : "1px",
      }}
    />
  </button>
);

// ロール管理ページ
export const AdminRoles = (): JSX.Element => {
  const [activeRoles, setActiveRoles] = useState<Set<number>>(new Set([0]));
  const [showAddRole, setShowAddRole] = useState(false);
  const [editingMembers, setEditingMembers] = useState<{
    roleName: UserRole;
    roleColor: string;
  } | null>(null);

  // ツール単位のマトリクス: [roleIdx][svcIdx][toolIdx]
  const [toolMatrix, setToolMatrix] = useState<boolean[][][]>(
    ROLE_DEFINITIONS.map((r) => r.toolDefaults.map((tools) => [...tools])),
  );

  // ツール単位のトグル
  const flipTool = (roleIdx: number, svcIdx: number, toolIdx: number) => {
    setToolMatrix((prev) =>
      prev.map((role, ri) =>
        ri === roleIdx
          ? role.map((svc, si) =>
              si === svcIdx
                ? svc.map((v, ti) => (ti === toolIdx ? !v : v))
                : svc,
            )
          : role,
      ),
    );
  };

  // サービス単位のトグル
  const flipService = (roleIdx: number, svcIdx: number) => {
    setToolMatrix((prev) =>
      prev.map((role, ri) => {
        if (ri !== roleIdx) return role;
        return role.map((svc, si) => {
          if (si !== svcIdx) return svc;
          const allOn = svc.every(Boolean);
          return svc.map(() => !allOn);
        });
      }),
    );
  };

  // サービスがONか（ツールが1つでもON）
  const isSvcOn = (roleIdx: number, svcIdx: number) =>
    toolMatrix[roleIdx]?.[svcIdx]?.some(Boolean) ?? false;

  // 有効サービス数
  const getEnabledSvcCount = (roleIdx: number) =>
    SERVICES.filter((_, si) => isSvcOn(roleIdx, si)).length;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          ロール管理
        </h2>
        <button
          type="button"
          onClick={() => setShowAddRole(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400"
        >
          <span className="text-sm">+</span>
          ロール追加
        </button>
      </div>

      <div
        className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-black/[.04] p-2 dark:border-white/[.08] dark:bg-black/20"
      >
        {ROLE_DEFINITIONS.map((role, ri) => {
          const isActive = activeRoles.has(ri);
          const enabledTools =
            toolMatrix[ri]?.flat().filter(Boolean).length ?? 0;
          const totalTools = toolMatrix[ri]?.flat().length ?? 0;

          return (
            <div
              key={role.name}
              onClick={() => {
                setActiveRoles((prev) => {
                  const next = new Set(prev);
                  if (next.has(ri)) {
                    next.delete(ri);
                  } else {
                    next.add(ri);
                  }
                  return next;
                });
              }}
              className={`cursor-pointer rounded-xl bg-white transition-all duration-300 dark:bg-zinc-900 ${isActive ? "" : "border border-gray-200 dark:border-white/[.08]"}`}
              style={isActive ? {
                border: `1px solid ${role.color}30`,
                background: `linear-gradient(to bottom, ${role.color}06, transparent)`,
              } : undefined}
            >
              {/* ヘッダー行 */}
              <div className="flex items-center px-4 py-3">
                {/* ロールバッジ */}
                <div className="w-24 shrink-0">
                  <span
                    className="inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${role.color}18`,
                      color: role.color,
                    }}
                  >
                    {role.name}
                  </span>
                </div>

                {/* アバタースタック */}
                <div className="flex w-20 shrink-0 -space-x-1.5">
                  {INITIALS.slice(0, Math.min(3, role.userCount)).map(
                    (initial) => (
                      <div
                        key={initial}
                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-300 dark:border-zinc-900 dark:bg-zinc-700"
                      >
                        <span
                          className="text-[10px] font-semibold text-gray-600 dark:text-zinc-400"
                        >
                          {initial}
                        </span>
                      </div>
                    ),
                  )}
                  {role.userCount > 3 && (
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-300 dark:border-zinc-900 dark:bg-zinc-700"
                    >
                      <span
                        className="text-[8px] font-semibold text-gray-600 dark:text-zinc-400"
                      >
                        +{role.userCount - 3}
                      </span>
                    </div>
                  )}
                </div>

                {/* サービスアイコン横並び */}
                <div className="flex flex-1 items-center gap-2">
                  {SERVICES.map((svc, si) => {
                    const svcOn = isSvcOn(ri, si);
                    return (
                      <img
                        key={svc.name}
                        src={svc.logo}
                        alt={svc.name}
                        className="h-5 w-5 rounded-sm transition-opacity"
                        style={{ opacity: svcOn ? 1 : 0.2 }}
                      />
                    );
                  })}
                </div>

                {/* ツール数 */}
                <span
                  className="ml-auto text-[9px] tabular-nums text-gray-500 dark:text-zinc-500"
                >
                  {isActive
                    ? `${enabledTools}/${totalTools} tools`
                    : `${getEnabledSvcCount(ri)}/${SERVICES.length} サービス`}
                </span>
              </div>

              {/* 展開コンテンツ */}
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{
                  gridTemplateRows: isActive ? "1fr" : "0fr",
                }}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-4">
                    {/* ロール説明 + メンバー編集 */}
                    <div className="mb-4 flex items-center justify-between">
                      <span
                        className="text-[11px] text-gray-500 dark:text-zinc-500"
                      >
                        {role.description} · {role.userCount}名
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMembers({
                            roleName: role.name,
                            roleColor: role.color,
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-600 transition-colors dark:border-white/[.08] dark:bg-white/[.04] dark:text-zinc-400"
                      >
                        メンバー編集
                      </button>
                    </div>

                    {/* サービス×ツール グリッド */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {SERVICES.map((svc, si) => {
                        const svcOn = isSvcOn(ri, si);
                        const allOn =
                          toolMatrix[ri]?.[si]?.every(Boolean) ?? false;

                        return (
                          <div
                            key={svc.name}
                            className={`rounded-xl p-3 transition-all ${svcOn ? "border border-gray-200 bg-black/[.01] dark:border-white/[.08] dark:bg-white/[.02]" : "border border-transparent opacity-35"}`}
                          >
                            {/* サービスヘッダー */}
                            <div className="mb-2 flex items-center gap-2">
                              <img
                                src={svc.logo}
                                alt={svc.name}
                                className="h-4 w-4 rounded-sm"
                              />
                              <span
                                className={`text-xs font-medium ${svcOn ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-zinc-700"}`}
                              >
                                {svc.name}
                              </span>
                              <div className="ml-auto flex items-center gap-2">
                                <span
                                  className="text-[9px] tabular-nums text-gray-500 dark:text-zinc-500"
                                >
                                  {toolMatrix[ri]?.[si]?.filter(Boolean)
                                    .length ?? 0}
                                  /{svc.tools.length}
                                </span>
                                <Toggle
                                  on={allOn}
                                  partial={svcOn && !allOn}
                                  color={role.color}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    flipService(ri, si);
                                  }}
                                />
                              </div>
                            </div>

                            {/* ツールリスト */}
                            <div className="space-y-0.5">
                              {svc.tools.map((tool, ti) => {
                                const toolOn =
                                  toolMatrix[ri]?.[si]?.[ti] ?? false;
                                return (
                                  <button
                                    key={tool}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      flipTool(ri, si, ti);
                                    }}
                                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors"
                                    style={{
                                      backgroundColor: "transparent",
                                    }}
                                  >
                                    <Toggle on={toolOn} color={role.color} />
                                    <span
                                      className={`font-mono text-[10px] transition-colors ${toolOn ? "text-gray-600 dark:text-zinc-400" : "text-gray-300 line-through dark:text-zinc-700"}`}
                                    >
                                      {tool}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* モーダル */}
      {showAddRole && <AddRoleModal onClose={() => setShowAddRole(false)} />}
      {editingMembers && (
        <EditMembersModal
          roleName={editingMembers.roleName}
          roleColor={editingMembers.roleColor}
          onClose={() => setEditingMembers(null)}
        />
      )}
    </div>
  );
};
