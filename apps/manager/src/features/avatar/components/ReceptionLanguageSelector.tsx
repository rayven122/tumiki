"use client";

/**
 * 受付モード 言語選択コンポーネント
 * 来訪者が自分の言語を選択できる
 */

import { cn } from "@/lib/utils";

export type ReceptionLanguage = {
  code: string;
  label: string;
  flag: string;
};

export const RECEPTION_LANGUAGES: ReceptionLanguage[] = [
  { code: "ja-JP", label: "日本語", flag: "🇯🇵" },
  { code: "en-US", label: "English", flag: "🇺🇸" },
  { code: "zh-CN", label: "中文", flag: "🇨🇳" },
  { code: "ko-KR", label: "한국어", flag: "🇰🇷" },
];

type ReceptionLanguageSelectorProps = {
  currentLang: string;
  onChangeLang: (lang: string) => void;
};

export const ReceptionLanguageSelector = ({
  currentLang,
  onChangeLang,
}: ReceptionLanguageSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      {RECEPTION_LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => onChangeLang(lang.code)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5",
            "border backdrop-blur-md transition-all",
            "text-sm",
            currentLang === lang.code
              ? "border-white/40 bg-white/20 text-white"
              : "border-white/10 bg-black/20 text-white/60 hover:bg-white/10 hover:text-white",
          )}
          aria-label={lang.label}
        >
          <span>{lang.flag}</span>
          <span className="hidden sm:inline">{lang.label}</span>
        </button>
      ))}
    </div>
  );
};
