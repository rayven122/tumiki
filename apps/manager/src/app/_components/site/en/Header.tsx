"use client";

import Link from "next/link";
import Image from "next/image";
import { Github } from "lucide-react";
import { useSession } from "next-auth/react";
import { LanguageToggle } from "../LanguageToggle";
import {
  SIGNUP_BUTTON_STYLES,
  SIGNUP_SKELETON_STYLES,
} from "../_styles/buttonStyles";

type NavItem = {
  label: string;
  href: string;
};

type HeaderProps = {
  showCTA?: boolean;
  navItems?: NavItem[];
};

const defaultNavItems: NavItem[] = [
  { label: "About Tumiki", href: "/#about" },
  // { label: "Blog", href: "/blog" },
];

/**
 * サインアップ/ダッシュボードボタンコンポーネント
 * ログイン状態に応じて「Dashboard」または「Sign Up Free」を表示
 */
const SignUpButton = ({ variant }: { variant: "desktop" | "mobile" }) => {
  const { data: session, status } = useSession();

  // ローディング中はスケルトン表示
  if (status === "loading") {
    return <div className={SIGNUP_SKELETON_STYLES[variant]} />;
  }

  const buttonClass = SIGNUP_BUTTON_STYLES[variant];

  // ログイン済みの場合はダッシュボードへのリンク
  if (status === "authenticated") {
    // org_slug（現在選択されている組織）があればダッシュボードへ、なければオンボーディングへ
    const orgSlug = session.user.tumiki?.org_slug;
    const dashboardHref = orgSlug ? `/${orgSlug}/dashboard` : "/onboarding";

    return (
      <Link href={dashboardHref} className={buttonClass}>
        Dashboard
      </Link>
    );
  }

  // 未ログインの場合はサインアップへのリンク
  const buttonText = variant === "desktop" ? "Sign Up Free" : "Sign Up";

  return (
    <Link href="/signup" className={buttonClass}>
      {buttonText}
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
        <Link href="/" className="flex items-center gap-2 md:gap-3">
          <Image
            src="/favicon/logo.svg"
            alt="Tumiki Logo"
            width={24}
            height={24}
            className="h-6 w-6 md:h-8 md:w-8"
          />
          <span className="text-xl font-black tracking-tight text-black md:text-2xl">
            Tumiki
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
          {showCTA && <SignUpButton variant="desktop" />}
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
          {showCTA && <SignUpButton variant="mobile" />}
        </div>
      </nav>
    </header>
  );
};
