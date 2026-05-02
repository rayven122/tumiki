import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getAppPath: () => "/app",
  },
}));

import { buildChildEnv, resolveArgs, resolveValue } from "../path-resolver";

describe("path-resolver", () => {
  // Node.js 標準の process.platform / process.arch を vi.stubGlobal で書き換えるのは
  // 副作用が大きいため、defineProperty で一時的に上書きする。
  const originalPlatform = process.platform;
  const originalArch = process.arch;

  const setPlatform = (platform: NodeJS.Platform, arch: string) => {
    Object.defineProperty(process, "platform", { value: platform });
    Object.defineProperty(process, "arch", { value: arch });
  };

  beforeEach(() => {
    setPlatform("darwin", "arm64");
  });

  afterEach(() => {
    setPlatform(originalPlatform, originalArch);
  });

  describe("resolveValue", () => {
    test("${runtime:npx}プレースホルダをバンドル絶対パスに解決する", () => {
      expect(resolveValue("${runtime:npx}")).toStrictEqual(
        "/app/resources/runtime/darwin-arm64/bin/npx",
      );
    });

    test("${runtime:uvx}プレースホルダをバンドル絶対パスに解決する", () => {
      expect(resolveValue("${runtime:uvx}")).toStrictEqual(
        "/app/resources/runtime/darwin-arm64/bin/uvx",
      );
    });

    test("素のランタイム名（後方互換）もバンドル絶対パスに解決する", () => {
      expect(resolveValue("npx")).toStrictEqual(
        "/app/resources/runtime/darwin-arm64/bin/npx",
      );
      expect(resolveValue("uv")).toStrictEqual(
        "/app/resources/runtime/darwin-arm64/bin/uv",
      );
    });

    test("未知のランタイムプレースホルダはエラーを投げる", () => {
      expect(() => resolveValue("${runtime:unknown}")).toThrow(
        /未知のランタイムプレースホルダ/,
      );
    });

    test("ランタイム以外の文字列は素通しする", () => {
      expect(resolveValue("-y")).toStrictEqual("-y");
      expect(
        resolveValue("@modelcontextprotocol/server-filesystem"),
      ).toStrictEqual("@modelcontextprotocol/server-filesystem");
      expect(resolveValue("/Users/test/Documents")).toStrictEqual(
        "/Users/test/Documents",
      );
    });

    test("Windowsでは.exe拡張子が付与される", () => {
      // 実行ホストがmacOSの場合 path.join は POSIX セパレータを使うため、
      // ここでは末尾の .exe 付与のみを検証する（実Windows上ではpath.join が \\ を返す）
      setPlatform("win32", "x64");
      expect(resolveValue("${runtime:npx}")).toMatch(
        /\/win32-x64\/bin\/npx\.exe$/,
      );
    });
  });

  describe("resolveArgs", () => {
    test("配列の各要素を解決する", () => {
      expect(
        resolveArgs(["${runtime:npx}", "-y", "@example/server"]),
      ).toStrictEqual([
        "/app/resources/runtime/darwin-arm64/bin/npx",
        "-y",
        "@example/server",
      ]);
    });

    test("空配列はそのまま返す", () => {
      expect(resolveArgs([])).toStrictEqual([]);
    });
  });

  describe("buildChildEnv", () => {
    test("既存PATHの先頭にバンドルbinディレクトリを挿入する", () => {
      const result = buildChildEnv(
        { PATH: "/usr/bin:/bin" },
        { API_KEY: "test" },
      );
      expect(result.PATH).toStrictEqual(
        "/app/resources/runtime/darwin-arm64/bin:/usr/bin:/bin",
      );
      expect(result.API_KEY).toStrictEqual("test");
    });

    test("PATHが未設定の場合はバンドルbinディレクトリのみを設定する", () => {
      const result = buildChildEnv({});
      expect(result.PATH).toStrictEqual(
        "/app/resources/runtime/darwin-arm64/bin",
      );
    });

    test("WindowsはセミコロンでPATHを区切る", () => {
      setPlatform("win32", "x64");
      const result = buildChildEnv({
        PATH: "C:\\Windows;C:\\Windows\\System32",
      });
      // セパレータ ; が使われていること、既存PATHが末尾に残ることを検証
      expect(result.PATH).toMatch(/;C:\\Windows;C:\\Windows\\System32$/);
      expect(result.PATH).toContain(";");
    });

    test("undefined値はenvに含めない", () => {
      const result = buildChildEnv({ FOO: "bar", UNDEFINED_KEY: undefined });
      expect(result.FOO).toStrictEqual("bar");
      expect("UNDEFINED_KEY" in result).toStrictEqual(false);
    });

    test("extra引数は base より優先される", () => {
      const result = buildChildEnv({ FOO: "base" }, { FOO: "override" });
      expect(result.FOO).toStrictEqual("override");
    });
  });
});
