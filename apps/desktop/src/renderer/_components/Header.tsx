import type { JSX } from "react";
import { useAtom } from "jotai";
import { Bell, Moon, Sun } from "lucide-react";
import { themeAtom } from "../store/atoms";

export const Header = (): JSX.Element => {
  const [theme, setTheme] = useAtom(themeAtom);
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header
      className="px-6 py-3"
      style={{
        backgroundColor: "var(--bg-app)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            TUMIKI
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
            Desktop
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* テーマ切替 */}
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            aria-label={
              theme === "dark" ? "ライトモードに切替" : "ダークモードに切替"
            }
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          {/* 通知 */}
          <button
            className="relative rounded-lg p-2 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </button>
          {/* ユーザー */}
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium"
              style={{
                backgroundColor: "var(--bg-active)",
                color: "var(--text-secondary)",
              }}
            >
              田
            </div>
            <div>
              <div
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                田中太郎
              </div>
              <div
                className="text-[10px]"
                style={{ color: "var(--text-subtle)" }}
              >
                営業部
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
