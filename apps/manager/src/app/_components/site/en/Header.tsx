"use client";

import Link from "next/link";
import Image from "next/image";
import { LanguageToggle } from "../LanguageToggle";

interface NavItem {
  label: string;
  href: string;
}

interface HeaderProps {
  showCTA?: boolean;
  navItems?: NavItem[];
}

const defaultNavItems: NavItem[] = [
  { label: "About Tumiki", href: "/#about" },
  // { label: "Blog", href: "/blog" },
];

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
          <LanguageToggle />
          {showCTA && (
            <Link
              href="/signup"
              className="border-2 border-black bg-black px-7 py-3 font-semibold text-white shadow-[3px_3px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#6366f1]"
            >
              Sign Up
            </Link>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          {showCTA && (
            <Link
              href="/signup"
              className="border-2 border-black bg-black px-3 py-2 text-xs font-semibold text-white shadow-[2px_2px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0_#6366f1]"
            >
              Sign Up
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};
