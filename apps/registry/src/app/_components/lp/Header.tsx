"use client";

import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "#solution", label: "Product" },
  { href: "#features", label: "機能" },
  { href: "#cta", label: "お問い合わせ" },
] as const;

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // スクロール検知でヘッダー背景を動的に変化
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 border-b transition-colors duration-300 ${
        isScrolled
          ? "border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
        {/* ロゴ */}
        <a href="#" className="flex items-center">
          <span className="text-sm font-semibold tracking-tight text-white">
            TUMIKI
          </span>
        </a>

        {/* デスクトップナビ（中央配置） */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA（右側） */}
        <div className="hidden items-center gap-4 md:flex">
          <a
            href="/contact"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            体験する
          </a>
          <a
            href="/contact"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
          >
            お問い合わせ
          </a>
        </div>

        {/* モバイルハンバーガー */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center md:hidden"
          aria-label="メニューを開く"
        >
          <div className="flex flex-col gap-1.5">
            <span
              className={`block h-0.5 w-5 bg-white transition-transform ${isMenuOpen ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`block h-0.5 w-5 bg-white transition-opacity ${isMenuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-0.5 w-5 bg-white transition-transform ${isMenuOpen ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </div>
        </button>
      </div>

      {/* モバイルメニュー */}
      {isMenuOpen && (
        <div className="border-t border-white/[0.08] bg-[#0a0a0a] px-5 py-6 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="min-h-[44px] rounded-lg px-3 py-3 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.08] pt-4">
              <a
                href="/contact"
                className="min-h-[44px] px-3 py-3 text-center text-sm text-zinc-400"
                onClick={() => setIsMenuOpen(false)}
              >
                体験する
              </a>
              <a
                href="/contact"
                className="min-h-[44px] rounded-full bg-white px-4 py-3 text-center text-sm font-medium text-black transition-colors hover:bg-zinc-200"
                onClick={() => setIsMenuOpen(false)}
              >
                お問い合わせ
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
