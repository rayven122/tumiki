"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "tenant-console-theme";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
};

const readStoredTheme = (): Theme | null => {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
};

const persistTheme = (theme: Theme) => {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
};

type Props = {
  collapsed: boolean;
  initialTheme: Theme;
};

const ThemeToggle = ({ collapsed, initialTheme }: Props) => {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const storedTheme = readStoredTheme();
    const resolvedTheme = storedTheme ?? initialTheme;
    setTheme(resolvedTheme);
    applyTheme(resolvedTheme);
    persistTheme(resolvedTheme);
  }, [initialTheme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  const toggleTheme = () => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    persistTheme(nextTheme);
  };

  return (
    <button
      type="button"
      aria-label={`テーマを${nextTheme === "light" ? "ライト" : "ダーク"}に切り替え`}
      onClick={toggleTheme}
      className={`text-text-secondary hover:bg-bg-active hover:text-text-primary flex min-h-[44px] w-full items-center rounded-lg px-2 text-xs transition-colors ${collapsed ? "justify-center" : "gap-2.5"}`}
    >
      {theme === "dark" ? (
        <Moon size={14} className="shrink-0" />
      ) : (
        <Sun size={14} className="shrink-0" />
      )}
      {!collapsed && <span>{theme === "dark" ? "Dark" : "Light"}</span>}
    </button>
  );
};

export default ThemeToggle;
