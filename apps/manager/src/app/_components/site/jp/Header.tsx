"use client";

import Link from "next/link";
import Image from "next/image";
import { Github } from "lucide-react";
import { useSession } from "next-auth/react";
import { LanguageToggle } from "../LanguageToggle";

type NavItem = {
  label: string;
  href: string;
};

type HeaderProps = {
  showCTA?: boolean;
  navItems?: NavItem[];
};

const defaultNavItems: NavItem[] = [
  { label: "Tumiki MCPとは", href: "/jp#about" },
  // { label: "ブログ", href: "/blog" },
];

/**
 * CTAボタンコンポーネント
 * ログイン状態に応じて「ダッシュボードへ」または「無料で試す」を表示
 */
const CTAButton = ({ variant }: { variant: "desktop" | "mobile" }) => {
  const { data: session, status } = useSession();

  // ローディング中はスケルトン表示
  if (status === "loading") {
    const skeletonClass =
      variant === "desktop"
        ? "h-12 w-32 animate-pulse rounded border-2 border-gray-300 bg-gray-200"
        : "h-9 w-20 animate-pulse rounded border-2 border-gray-300 bg-gray-200";
    return <div className={skeletonClass} />;
  }

  // ログイン済みの場合はダッシュボードへのリンク
  if (status === "authenticated") {
    // org_slug（現在選択されている組織）があればダッシュボードへ、なければオンボーディングへ
    const orgSlug = session.user.tumiki?.org_slug;
    const dashboardHref = orgSlug ? `/${orgSlug}/dashboard` : "/onboarding";

    const buttonClass =
      variant === "desktop"
        ? "border-2 border-black bg-black px-7 py-3 font-semibold text-white shadow-[3px_3px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#6366f1]"
        : "border-2 border-black bg-black px-3 py-2 text-xs font-semibold text-white shadow-[2px_2px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0_#6366f1]";

    const buttonText =
      variant === "desktop" ? "ダッシュボードへ" : "ダッシュボード";

    return (
      <Link href={dashboardHref} className={buttonClass}>
        {buttonText}
      </Link>
    );
  }

  // 未ログインの場合はサインアップへのリンク
  const buttonClass =
    variant === "desktop"
      ? "border-2 border-black bg-black px-7 py-3 font-semibold text-white shadow-[3px_3px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#6366f1]"
      : "border-2 border-black bg-black px-3 py-2 text-xs font-semibold text-white shadow-[2px_2px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0_#6366f1]";

  return (
    <Link href="/signup" className={buttonClass}>
      無料で試す
    </Link>
  );
};

export const Header = ({
  showCTA = true,
  navItems = defaultNavItems,
}: HeaderProps) => {
  return (
    <header className="fixed top-0 z-50 w-full border-b-2 border-black bg-white transition-all duration-300">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/jp" className="flex items-center gap-2 md:gap-3">
          <Image
            src="/favicon/logo.svg"
            alt="Tumiki Logo"
            width={24}
            height={24}
            className="h-6 w-6 md:h-8 md:w-8"
          />
          <span className="text-xl font-black tracking-tight text-black md:text-2xl">
            Tumiki MCP
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative font-medium text-gray-600 transition-colors hover:text-black"
            >
              {item.label}
              <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-black transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
          <Link
            href="https://github.com/rayven122/tumiki"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border-2 border-black bg-white px-4 py-2 font-semibold text-black shadow-[2px_2px_0_#000] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0_#000]"
            aria-label="View on GitHub"
          >
            <Github className="h-5 w-5" />
            <span>GitHub</span>
          </Link>
          <LanguageToggle />
          {showCTA && <CTAButton variant="desktop" />}
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="https://github.com/rayven122/tumiki"
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-black bg-white p-2 text-black shadow-[2px_2px_0_#000] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[3px_3px_0_#000]"
            aria-label="View on GitHub"
          >
            <Github className="h-5 w-5" />
          </Link>
          <LanguageToggle />
          {showCTA && <CTAButton variant="mobile" />}
        </div>
      </nav>
    </header>
  );
};
