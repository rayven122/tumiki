import { describe, test, expect, vi } from "vitest";
import path from "node:path";

// `electron` モジュールはテスト環境では読み込めないためモック化する。
// `app-protocol.ts` は import 時に副作用がないため、関数を呼ばなければモックの戻り値は影響しない。
vi.mock("electron", () => ({
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: vi.fn(),
  },
  net: {
    fetch: vi.fn(),
  },
}));

vi.mock("../utils/logger", () => ({
  warn: vi.fn(),
}));

const {
  APP_SCHEME,
  APP_BUNDLE_HOST,
  APP_INDEX_URL,
  getRendererRoot,
  resolveSafePath,
} = await import("../app-protocol");

describe("定数", () => {
  test("APP_SCHEME は tumiki-bundle（deep link 用 tumiki:// と区別するため）", () => {
    expect(APP_SCHEME).toStrictEqual("tumiki-bundle");
  });

  test("APP_INDEX_URL は スキーム + ホスト + /index.html を組み立てる", () => {
    expect(APP_INDEX_URL).toStrictEqual(
      `${APP_SCHEME}://${APP_BUNDLE_HOST}/index.html`,
    );
  });
});

describe("getRendererRoot", () => {
  test("mainDir 配下の ../renderer に解決される", () => {
    const result = getRendererRoot("/foo/bar/dist-electron/main");
    expect(result).toStrictEqual(
      path.join("/foo/bar/dist-electron/main", "../renderer"),
    );
  });
});

describe("resolveSafePath", () => {
  const rendererRoot = "/app/dist-electron/renderer";

  test("正常な絶対パス（/logos/foo.svg）は rendererRoot 配下にマップされる", () => {
    const result = resolveSafePath(rendererRoot, "/logos/foo.svg");
    expect(result).toStrictEqual(path.join(rendererRoot, "logos/foo.svg"));
  });

  test("ルート（/index.html）も rendererRoot 配下にマップされる", () => {
    const result = resolveSafePath(rendererRoot, "/index.html");
    expect(result).toStrictEqual(path.join(rendererRoot, "index.html"));
  });

  test("ルート単体（/）は rendererRoot 自体に解決される", () => {
    const result = resolveSafePath(rendererRoot, "/");
    expect(result).toStrictEqual(rendererRoot);
  });

  test("../ によるパストラバーサルは null を返す", () => {
    const result = resolveSafePath(rendererRoot, "/../../../etc/passwd");
    expect(result).toBeNull();
  });

  test("中間に ../ を含むパストラバーサルも null を返す", () => {
    const result = resolveSafePath(rendererRoot, "/logos/../../../etc/passwd");
    expect(result).toBeNull();
  });

  test("パーセントエンコードされた ../ も null を返す", () => {
    // %2e%2e%2f = ../
    const result = resolveSafePath(
      rendererRoot,
      "/%2e%2e%2f%2e%2e%2fetc/passwd",
    );
    expect(result).toBeNull();
  });

  test("パーセントエンコードされた正常パスはデコードして解決される", () => {
    // %20 = space
    const result = resolveSafePath(rendererRoot, "/logos/foo%20bar.svg");
    expect(result).toStrictEqual(path.join(rendererRoot, "logos/foo bar.svg"));
  });

  test("ネストしたパスも安全に解決される", () => {
    const result = resolveSafePath(
      rendererRoot,
      "/logos/ai-clients/cursor.svg",
    );
    expect(result).toStrictEqual(
      path.join(rendererRoot, "logos/ai-clients/cursor.svg"),
    );
  });
});
