import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    isPackaged: false, // 各テストで上書きする
  },
}));

import { app } from "electron";
import { getMcpProxyLaunchCommand } from "../launch-command";

describe("getMcpProxyLaunchCommand", () => {
  const originalExecPath = process.execPath;
  const originalArgv = process.argv;
  const originalAppImage = process.env.APPIMAGE;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, "execPath", {
      value: originalExecPath,
      writable: true,
    });
    process.argv = originalArgv;
    if (originalAppImage === undefined) {
      delete process.env.APPIMAGE;
    } else {
      process.env.APPIMAGE = originalAppImage;
    }
  });

  test("packaged + macOS: process.execPath をそのまま command に返す", () => {
    Object.defineProperty(app, "isPackaged", { value: true, writable: true });
    Object.defineProperty(process, "execPath", {
      value: "/Applications/Tumiki.app/Contents/MacOS/Tumiki",
      writable: true,
    });
    delete process.env.APPIMAGE;

    expect(getMcpProxyLaunchCommand()).toStrictEqual({
      command: "/Applications/Tumiki.app/Contents/MacOS/Tumiki",
      args: ["--mcp-proxy"],
    });
  });

  test("packaged + Windows: .exe パスを command に返す", () => {
    Object.defineProperty(app, "isPackaged", { value: true, writable: true });
    Object.defineProperty(process, "execPath", {
      value: "C:\\Program Files\\Tumiki\\Tumiki.exe",
      writable: true,
    });
    delete process.env.APPIMAGE;

    expect(getMcpProxyLaunchCommand()).toStrictEqual({
      command: "C:\\Program Files\\Tumiki\\Tumiki.exe",
      args: ["--mcp-proxy"],
    });
  });

  test("packaged + Linux native: /usr/bin パスを command に返す", () => {
    Object.defineProperty(app, "isPackaged", { value: true, writable: true });
    Object.defineProperty(process, "execPath", {
      value: "/usr/bin/tumiki",
      writable: true,
    });
    delete process.env.APPIMAGE;

    expect(getMcpProxyLaunchCommand()).toStrictEqual({
      command: "/usr/bin/tumiki",
      args: ["--mcp-proxy"],
    });
  });

  test("packaged + Linux AppImage: APPIMAGE 環境変数を優先する", () => {
    Object.defineProperty(app, "isPackaged", { value: true, writable: true });
    Object.defineProperty(process, "execPath", {
      value: "/tmp/.mount_TumikiXXXXXX/usr/bin/tumiki",
      writable: true,
    });
    process.env.APPIMAGE = "/home/user/Apps/Tumiki-1.0.0.AppImage";

    expect(getMcpProxyLaunchCommand()).toStrictEqual({
      command: "/home/user/Apps/Tumiki-1.0.0.AppImage",
      args: ["--mcp-proxy"],
    });
  });

  test("dev: process.execPath + エントリースクリプトを args 先頭に入れる", () => {
    Object.defineProperty(app, "isPackaged", { value: false, writable: true });
    Object.defineProperty(process, "execPath", {
      value: "/repo/node_modules/.bin/electron",
      writable: true,
    });
    process.argv = [
      "/repo/node_modules/.bin/electron",
      "/repo/apps/desktop/dist-electron/main/index.js",
    ];
    delete process.env.APPIMAGE;

    expect(getMcpProxyLaunchCommand()).toStrictEqual({
      command: "/repo/node_modules/.bin/electron",
      args: ["/repo/apps/desktop/dist-electron/main/index.js", "--mcp-proxy"],
    });
  });

  test("dev でエントリースクリプトが取れない場合は --mcp-proxy のみ args に入る", () => {
    Object.defineProperty(app, "isPackaged", { value: false, writable: true });
    Object.defineProperty(process, "execPath", {
      value: "/repo/node_modules/.bin/electron",
      writable: true,
    });
    process.argv = ["/repo/node_modules/.bin/electron"];
    delete process.env.APPIMAGE;

    expect(getMcpProxyLaunchCommand()).toStrictEqual({
      command: "/repo/node_modules/.bin/electron",
      args: ["--mcp-proxy"],
    });
  });
});
