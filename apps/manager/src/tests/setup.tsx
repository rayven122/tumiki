import "@testing-library/jest-dom";
import { vi } from "vitest";

// 環境変数の設定
vi.stubEnv("API_KEY_PREFIX", "test_");
vi.stubEnv("API_KEY_LENGTH", "32");

// グローバルモックの設定
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Next.js Image コンポーネントのモック
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => {
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Next.js Router のモック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// server-only モジュールのモック
vi.mock("server-only", () => ({}));
