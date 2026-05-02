import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// userData は実ファイルシステムを汚さないよう各テストで一時ディレクトリを返す
let tmpUserData = "";

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getAppPath: () => "/app",
    getPath: (name: string) => {
      if (name === "userData") return tmpUserData;
      return "/test";
    },
  },
}));

import {
  buildChildEnv,
  ensureNodeShim,
  resolveArgs,
  resolveValue,
} from "../path-resolver";

describe("path-resolver", () => {
  // process.platform / process.arch を defineProperty で一時的に上書きする
  const originalPlatform = process.platform;
  const originalArch = process.arch;
  const originalExecPath = process.execPath;

  const setPlatform = (platform: NodeJS.Platform, arch: string) => {
    Object.defineProperty(process, "platform", { value: platform });
    Object.defineProperty(process, "arch", { value: arch });
  };

  const setExecPath = (execPath: string) => {
    Object.defineProperty(process, "execPath", { value: execPath });
  };

  beforeEach(() => {
    setPlatform("darwin", "arm64");
    tmpUserData = mkdtempSync(path.join(tmpdir(), "tumiki-resolver-"));
  });

  afterEach(() => {
    setPlatform(originalPlatform, originalArch);
    setExecPath(originalExecPath);
    if (tmpUserData) rmSync(tmpUserData, { recursive: true, force: true });
  });

  describe("resolveValue", () => {
    test("${runtime:node}は userData の shim パスに解決する", () => {
      expect(resolveValue("${runtime:node}")).toStrictEqual(
        path.join(tmpUserData, "runtime", "bin", "node"),
      );
    });

    test("${runtime:npx}はバンドル binディレクトリの絶対パスに解決する", () => {
      expect(resolveValue("${runtime:npx}")).toStrictEqual(
        "/app/resources/runtime/darwin-arm64/bin/npx",
      );
    });

    test("${runtime:npm}はバンドル binディレクトリの絶対パスに解決する", () => {
      expect(resolveValue("${runtime:npm}")).toStrictEqual(
        "/app/resources/runtime/darwin-arm64/bin/npm",
      );
    });

    test("${runtime:uvx}はバンドル binディレクトリの絶対パスに解決する", () => {
      expect(resolveValue("${runtime:uvx}")).toStrictEqual(
        "/app/resources/runtime/darwin-arm64/bin/uvx",
      );
    });

    test("素の 'node' (後方互換) は shim パスに解決する", () => {
      expect(resolveValue("node")).toStrictEqual(
        path.join(tmpUserData, "runtime", "bin", "node"),
      );
    });

    test("素の 'npx' / 'uv' (後方互換) はバンドル binに解決する", () => {
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
      // 末尾の .exe 付与のみを検証する（実Windows上では path.join が \\ を返す）
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
    test("PATHが shim → バンドル bin → 既存 の優先順で組み立てられる", () => {
      const result = buildChildEnv(
        { PATH: "/usr/bin:/bin" },
        { API_KEY: "test" },
      );
      expect(result.PATH).toStrictEqual(
        `${path.join(tmpUserData, "runtime", "bin")}:/app/resources/runtime/darwin-arm64/bin:/usr/bin:/bin`,
      );
      expect(result.API_KEY).toStrictEqual("test");
    });

    test("PATHが未設定の場合は shim とバンドル binのみが入る", () => {
      const result = buildChildEnv({});
      expect(result.PATH).toStrictEqual(
        `${path.join(tmpUserData, "runtime", "bin")}:/app/resources/runtime/darwin-arm64/bin`,
      );
    });

    test("WindowsはセミコロンでPATHを区切る", () => {
      setPlatform("win32", "x64");
      const result = buildChildEnv({
        PATH: "C:\\Windows;C:\\Windows\\System32",
      });
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

  describe("ensureNodeShim", () => {
    test("Electron バイナリを ELECTRON_RUN_AS_NODE で exec する shim を生成する", () => {
      setExecPath("/path/to/Electron");
      ensureNodeShim();

      const shimPath = path.join(tmpUserData, "runtime", "bin", "node");
      expect(existsSync(shimPath)).toStrictEqual(true);
      const content = readFileSync(shimPath, "utf8");
      expect(content).toContain("#!/bin/sh");
      expect(content).toContain("ELECTRON_RUN_AS_NODE=1");
      expect(content).toContain("'/path/to/Electron'");
      expect(content).toContain('"$@"');
    });

    test("execPath に単一引用符が含まれていてもエスケープされる", () => {
      setExecPath("/Users/foo's/Electron");
      ensureNodeShim();

      const content = readFileSync(
        path.join(tmpUserData, "runtime", "bin", "node"),
        "utf8",
      );
      // 'foo'\''s' のエスケープ（POSIX sh 標準）
      expect(content).toContain(`'/Users/foo'\\''s/Electron'`);
    });

    test("既存 shim と内容が同一ならファイルを書き換えない", () => {
      setExecPath("/path/to/Electron");
      ensureNodeShim();
      const shimPath = path.join(tmpUserData, "runtime", "bin", "node");
      const firstContent = readFileSync(shimPath, "utf8");

      ensureNodeShim();
      const secondContent = readFileSync(shimPath, "utf8");

      expect(secondContent).toStrictEqual(firstContent);
    });

    test("execPath が変わったら shim を上書きする（アプリ更新時想定）", () => {
      setExecPath("/old/Electron");
      ensureNodeShim();

      setExecPath("/new/Electron");
      ensureNodeShim();

      const content = readFileSync(
        path.join(tmpUserData, "runtime", "bin", "node"),
        "utf8",
      );
      expect(content).toContain("'/new/Electron'");
      expect(content).not.toContain("'/old/Electron'");
    });

    test("Windows ではスキップする (現状未対応)", () => {
      setPlatform("win32", "x64");
      ensureNodeShim();
      // shim ファイルが作られないこと
      expect(
        existsSync(path.join(tmpUserData, "runtime", "bin", "node")),
      ).toStrictEqual(false);
    });
  });
});
