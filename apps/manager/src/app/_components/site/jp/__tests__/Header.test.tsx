/**
 * @vitest-environment jsdom
 */
import * as React from "react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { Header } from "../Header";

// Reactをグローバルに設定（モック内で使用するため）
(globalThis as unknown as { React: typeof React }).React = React;

// next-auth/reactのモック
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// next/imageをモック
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
  }) => (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      data-testid="next-image"
    />
  ),
}));

// next/linkをモック
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    "aria-label": ariaLabel,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      data-testid="next-link"
    >
      {children}
    </a>
  ),
}));

// LanguageToggleをモック
vi.mock("../../LanguageToggle", () => ({
  LanguageToggle: () => <div data-testid="language-toggle">LanguageToggle</div>,
}));

const mockUseSession = vi.mocked(useSession);

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CTAButton", () => {
    test("status === 'loading' の場合、スケルトン表示されること", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });

      render(<Header />);

      // デスクトップ用とモバイル用のスケルトンが表示される
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBe(2);
    });

    test("status === 'authenticated' で org_slug がある場合、ダッシュボードリンクが表示されること", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            tumiki: {
              org_slug: "test-org",
            },
          },
          expires: "2099-01-01",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<Header />);

      // デスクトップ用: "ダッシュボードへ"
      expect(screen.getByText("ダッシュボードへ")).toBeInTheDocument();
      // モバイル用: "ダッシュボード"
      expect(screen.getByText("ダッシュボード")).toBeInTheDocument();

      // リンク先がダッシュボードになっていること
      const links = screen.getAllByTestId("next-link");
      const dashboardLink = links.find((link) =>
        link.getAttribute("href")?.includes("/test-org/dashboard"),
      );
      expect(dashboardLink).toBeTruthy();
    });

    test("status === 'authenticated' で org_slug がない場合、onboardingリンクが表示されること", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            tumiki: {
              org_slug: undefined,
            },
          },
          expires: "2099-01-01",
        },
        status: "authenticated",
        update: vi.fn(),
      });

      render(<Header />);

      // ダッシュボード系のテキストが表示される
      expect(screen.getByText("ダッシュボードへ")).toBeInTheDocument();
      expect(screen.getByText("ダッシュボード")).toBeInTheDocument();

      // リンク先がonboardingになっていること
      const links = screen.getAllByTestId("next-link");
      const onboardingLink = links.find(
        (link) => link.getAttribute("href") === "/onboarding",
      );
      expect(onboardingLink).toBeTruthy();
    });

    test("status === 'unauthenticated' の場合、無料で試すリンクが表示されること", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      render(<Header />);

      // 日本語版は「無料で試す」が2つ（デスクトップ用とモバイル用）
      const signupLinks = screen.getAllByText("無料で試す");
      expect(signupLinks.length).toBe(2);

      // リンク先が/signupになっていること
      const links = screen.getAllByTestId("next-link");
      const signupLinkElements = links.filter(
        (link) => link.getAttribute("href") === "/signup",
      );
      expect(signupLinkElements.length).toBe(2);
    });

    test("showCTA === false の場合、CTAボタンが表示されないこと", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      render(<Header showCTA={false} />);

      // 無料で試すが表示されないこと
      expect(screen.queryByText("無料で試す")).not.toBeInTheDocument();
    });
  });

  describe("Header全体", () => {
    test("ロゴとTumiki MCPテキストが表示されること", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      render(<Header />);

      expect(screen.getByText("Tumiki MCP")).toBeInTheDocument();
      expect(screen.getByAltText("Tumiki Logo")).toBeInTheDocument();
    });

    test("GitHubリンクが表示されること", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      render(<Header />);

      const githubLinks = screen.getAllByLabelText("View on GitHub");
      expect(githubLinks.length).toBe(2); // デスクトップ用とモバイル用
    });

    test("LanguageToggleが表示されること", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      render(<Header />);

      const languageToggles = screen.getAllByTestId("language-toggle");
      expect(languageToggles.length).toBe(2); // デスクトップ用とモバイル用
    });

    test("カスタムnavItemsが表示されること", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      const customNavItems = [
        { label: "カスタムリンク1", href: "/custom1" },
        { label: "カスタムリンク2", href: "/custom2" },
      ];

      render(<Header navItems={customNavItems} />);

      expect(screen.getByText("カスタムリンク1")).toBeInTheDocument();
      expect(screen.getByText("カスタムリンク2")).toBeInTheDocument();
    });
  });
});
