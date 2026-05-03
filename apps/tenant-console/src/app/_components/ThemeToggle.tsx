"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

const STORAGE_KEY = "tenant-console-theme";

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
};

const readInitialTheme = (): Theme => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
};

const ThemeToggle = ({ collapsed }: { collapsed: boolean }) => {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initialTheme = readInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";

  const toggleTheme = () => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  return (
    <button
      type="button"
      aria-label={`テーマを${nextTheme === "light" ? "ライト" : "ダーク"}に切り替え`}
      onClick={toggleTheme}
      className={`text-text-secondary hover:bg-bg-active hover:text-text-primary flex w-full items-center rounded-lg px-2 py-2 text-xs transition-colors ${collapsed ? "justify-center" : "gap-2.5"}`}
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
