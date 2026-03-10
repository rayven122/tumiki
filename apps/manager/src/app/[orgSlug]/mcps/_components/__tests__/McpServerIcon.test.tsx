/**
 * @vitest-environment jsdom
 */
import * as React from "react";
import { type ReactNode } from "react";
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { McpServerIcon } from "../McpServerIcon";

// Reactをグローバルに設定（モック内で使用するため）
(globalThis as unknown as { React: typeof React }).React = React;

// next/imageをモック
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      data-testid="next-image"
    />
  ),
}));

// FaviconImageをモック
vi.mock("@/features/shared/components/FaviconImage", () => ({
  FaviconImage: ({
    url,
    alt,
    fallback,
  }: {
    url: string | null | undefined;
    alt: string;
    size: number;
    fallback: ReactNode;
  }) =>
    url ? (
      <img src={`favicon:${url}`} alt={alt} data-testid="favicon-image" />
    ) : (
      fallback
    ),
}));

describe("McpServerIcon", () => {
  describe("lucide形式のiconPath", () => {
    test("lucide:Server形式のアイコンを表示する", () => {
      render(<McpServerIcon iconPath="lucide:Server" size={32} />);

      // lucide-reactアイコンはSVGとしてレンダリングされる
      const svg = document.querySelector("svg");
      expect(svg).toBeTruthy();
    });

    test("lucide:Bot形式のアイコンを表示する", () => {
      render(<McpServerIcon iconPath="lucide:Bot" size={32} />);

      const svg = document.querySelector("svg");
      expect(svg).toBeTruthy();
    });

    test("存在しないlucideアイコン名の場合はフォールバックを表示する", () => {
      render(
        <McpServerIcon
          iconPath="lucide:NonExistentIcon"
          fallbackUrl="https://example.com"
          size={32}
        />,
      );

      // フォールバックとしてFaviconImageが表示される
      const faviconImage = screen.getByTestId("favicon-image");
      expect(faviconImage).toBeTruthy();
    });
  });

  describe("URL形式のiconPath", () => {
    test("カスタム画像URLを表示する", () => {
      const imageUrl = "https://example.blob.vercel-storage.com/image.png";
      render(<McpServerIcon iconPath={imageUrl} size={32} />);

      const image = screen.getByTestId("next-image");
      expect(image).toHaveAttribute("src", imageUrl);
    });

    test("alt属性が正しく設定される", () => {
      const imageUrl = "https://example.com/icon.png";
      render(
        <McpServerIcon iconPath={imageUrl} alt="テストサーバー" size={32} />,
      );

      const image = screen.getByTestId("next-image");
      expect(image).toHaveAttribute("alt", "テストサーバー");
    });
  });

  describe("フォールバック表示", () => {
    test("iconPathがnullの場合はFaviconImageを表示する", () => {
      render(
        <McpServerIcon
          iconPath={null}
          fallbackUrl="https://example.com"
          size={32}
        />,
      );

      const faviconImage = screen.getByTestId("favicon-image");
      expect(faviconImage).toBeTruthy();
    });

    test("iconPathがundefinedの場合はFaviconImageを表示する", () => {
      render(
        <McpServerIcon
          iconPath={undefined}
          fallbackUrl="https://example.com"
          size={32}
        />,
      );

      const faviconImage = screen.getByTestId("favicon-image");
      expect(faviconImage).toBeTruthy();
    });

    test("fallbackUrlもない場合はデフォルトアイコンを表示する", () => {
      render(<McpServerIcon iconPath={null} fallbackUrl={null} size={32} />);

      // デフォルトのImageIconが表示される
      const fallbackDiv = document.querySelector(".bg-gray-200");
      expect(fallbackDiv).toBeTruthy();
    });
  });

  describe("サイズ指定", () => {
    test("デフォルトサイズは32px", () => {
      render(<McpServerIcon iconPath="lucide:Server" />);

      const svg = document.querySelector("svg");
      expect(svg).toHaveStyle({ width: "32px", height: "32px" });
    });

    test("カスタムサイズを指定できる", () => {
      render(<McpServerIcon iconPath="lucide:Server" size={48} />);

      const svg = document.querySelector("svg");
      expect(svg).toHaveStyle({ width: "48px", height: "48px" });
    });
  });
});
