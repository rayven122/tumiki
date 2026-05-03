import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAtom } from "jotai";
import {
  Home,
  Wrench,
  History,
  ShieldCheck,
  Settings,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Plug,
  Building2,
  User,
} from "lucide-react";
import { themeAtom, sidebarOpenAtom } from "../store/atoms";
import type { ProfileState } from "../../shared/types";

type NavItem = {
  path: string;
  label: string;
  icon: JSX.Element;
};

const mainNav: NavItem[] = [
  { path: "/", label: "ホーム", icon: <Home size={18} /> },
  { path: "/tools", label: "コネクト", icon: <Wrench size={18} /> },
  { path: "/history", label: "操作履歴", icon: <History size={18} /> },
  { path: "/requests", label: "権限申請", icon: <ShieldCheck size={18} /> },
];

const subNav: NavItem[] = [
  { path: "/settings", label: "設定", icon: <Settings size={18} /> },
];

export const Sidebar = (): JSX.Element => {
  const location = useLocation();
  const [theme, setTheme] = useAtom(themeAtom);
  const [isOpen, setIsOpen] = useAtom(sidebarOpenAtom);
  const [profile, setProfile] = useState<ProfileState | null>(null);

  const refreshProfile = useCallback((): void => {
    window.electronAPI.profile
      .getState()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    window.addEventListener("profile:changed", refreshProfile);
    return () => {
      window.removeEventListener("profile:changed", refreshProfile);
    };
  }, [refreshProfile]);

  const toggleTheme = (): void => setTheme(theme === "dark" ? "light" : "dark");
  const isOrganization = profile?.activeProfile === "organization";

  const renderLink = (item: NavItem): JSX.Element => {
    const isActive =
      item.path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
            : "text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-secondary)]"
        }`}
        title={!isOpen ? item.label : undefined}
      >
        {item.icon}
        {isOpen && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={`flex shrink-0 flex-col bg-[var(--bg-app)] py-3 transition-all duration-200 ${
        isOpen ? "w-[220px]" : "w-14"
      }`}
    >
      {/* ワークスペース */}
      <div className="mb-4 flex items-center justify-between px-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <img
            src="/rayven_white.png"
            alt="RAYVEN"
            className={`h-6 w-6 shrink-0 ${theme === "light" ? "invert" : ""}`}
          />
          {isOpen && (
            <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
              RAYVEN
            </span>
          )}
        </div>
        {isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="shrink-0 rounded-md p-1 text-[var(--text-subtle)] transition-colors hover:text-[var(--text-secondary)]"
            aria-label="サイドバーを閉じる"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {/* プロファイル */}
      <div className="mb-3 px-2">
        <div
          className={`flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-2 ${
            isOpen ? "" : "justify-center"
          }`}
          title={
            isOrganization
              ? `組織利用: ${profile?.organizationProfile?.managerUrl ?? ""}`
              : "個人利用"
          }
        >
          {isOrganization ? (
            <Building2 size={16} className="text-[var(--badge-info-text)]" />
          ) : (
            <User size={16} className="text-[var(--badge-success-text)]" />
          )}
          {isOpen && (
            <div className="min-w-0">
              <div className="text-xs font-medium text-[var(--text-primary)]">
                {isOrganization ? "組織利用" : "個人利用"}
              </div>
              <div className="truncate text-[10px] text-[var(--text-subtle)]">
                {isOrganization
                  ? profile?.organizationProfile?.managerUrl
                  : "ローカルプロファイル"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 収納時の展開ボタン */}
      {!isOpen && (
        <div className="mb-2 px-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex w-full items-center justify-center rounded-md p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-secondary)]"
            aria-label="サイドバーを開く"
          >
            <PanelLeft size={16} />
          </button>
        </div>
      )}

      {/* メインナビ */}
      <nav className="flex flex-1 flex-col px-2">
        <div className="space-y-0.5">{mainNav.map(renderLink)}</div>

        {/* カスタムコネクタ */}
        <div className="mt-2 space-y-0.5 border-t border-t-[var(--border)] pt-2">
          {isOpen && (
            <div className="px-3 pt-1 pb-1 text-[10px] font-medium tracking-wider text-[var(--text-subtle)] uppercase">
              カスタムコネクタ
            </div>
          )}
          {renderLink({
            path: "/tools/connector/auto",
            label: "AIで自動作成",
            icon: <Sparkles size={18} />,
          })}
          {renderLink({
            path: "/tools/connector/manual",
            label: "マニュアル作成",
            icon: <Wrench size={18} />,
          })}
        </div>

        {/* AIツール連携 */}
        <div className="mt-2 space-y-0.5 border-t border-t-[var(--border)] pt-2">
          {renderLink({
            path: "/ai-integrations",
            label: "AIツール連携",
            icon: <Plug size={18} />,
          })}
        </div>

        {/* 下部: 設定 + テーマ切替 */}
        <div className="mt-auto space-y-0.5 border-t border-t-[var(--border)] pt-3">
          {subNav.map(renderLink)}

          {/* テーマ切替 */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-secondary)]"
            aria-label={
              theme === "dark" ? "ライトモードに切替" : "ダークモードに切替"
            }
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {isOpen && (
              <span>{theme === "dark" ? "ライトモード" : "ダークモード"}</span>
            )}
          </button>
        </div>
      </nav>
    </aside>
  );
};
