"use client";

import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const isJapanese = pathname === "/jp";

  const toggleLanguage = () => {
    if (isJapanese) {
      router.push("/");
    } else {
      router.push("/jp");
    }
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1 rounded-full border-2 border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:border-black hover:text-black hover:shadow-[2px_2px_0_rgba(0,0,0,0.1)] md:gap-2 md:px-4"
      aria-label={isJapanese ? "Switch to English" : "日本語に切り替え"}
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs md:text-sm">{isJapanese ? "EN" : "JP"}</span>
    </button>
  );
}
