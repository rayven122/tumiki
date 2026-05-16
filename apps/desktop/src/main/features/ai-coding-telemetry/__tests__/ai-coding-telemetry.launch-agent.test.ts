import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
  },
}));

import { app } from "electron";
import {
  buildTelemetryLaunchAgentPlist,
  getTelemetryReceiverLaunchCommand,
  TELEMETRY_LAUNCH_AGENT_LABEL,
} from "../ai-coding-telemetry.launch-agent";

describe("getTelemetryReceiverLaunchCommand", () => {
  const originalExecPath = process.execPath;
  const originalArgv = process.argv;
  const originalIsPackaged = app.isPackaged;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, "execPath", {
      value: originalExecPath,
      writable: true,
    });
    process.argv = originalArgv;
    Object.defineProperty(app, "isPackaged", {
      value: originalIsPackaged,
      writable: true,
    });
  });

  test("packaged ではアプリ実行ファイルに --telemetry-receiver を渡す", () => {
    Object.defineProperty(app, "isPackaged", { value: true, writable: true });
    Object.defineProperty(process, "execPath", {
      value: "/Applications/Tumiki.app/Contents/MacOS/Tumiki",
      writable: true,
    });

    expect(getTelemetryReceiverLaunchCommand()).toStrictEqual({
      command: "/Applications/Tumiki.app/Contents/MacOS/Tumiki",
      args: ["--telemetry-receiver"],
    });
  });

  test("dev では Electron と entrypoint に --telemetry-receiver を渡す", () => {
    Object.defineProperty(app, "isPackaged", { value: false, writable: true });
    Object.defineProperty(process, "execPath", {
      value: "/repo/node_modules/.bin/electron",
      writable: true,
    });
    process.argv = [
      "/repo/node_modules/.bin/electron",
      "/repo/apps/desktop/dist-electron/main/index.js",
    ];

    expect(getTelemetryReceiverLaunchCommand()).toStrictEqual({
      command: "/repo/node_modules/.bin/electron",
      args: [
        "/repo/apps/desktop/dist-electron/main/index.js",
        "--telemetry-receiver",
      ],
    });
  });
});

describe("buildTelemetryLaunchAgentPlist", () => {
  test("LaunchAgent に headless receiver 起動設定を書き出す", () => {
    const plist = buildTelemetryLaunchAgentPlist({
      command: "/Applications/Tumiki.app/Contents/MacOS/Tumiki",
      args: ["--telemetry-receiver"],
    });

    expect(plist).toContain(`<string>${TELEMETRY_LAUNCH_AGENT_LABEL}</string>`);
    expect(plist).toContain("<key>RunAtLoad</key>");
    expect(plist).toContain("<key>KeepAlive</key>");
    expect(plist).toContain("<key>SuccessfulExit</key>");
    expect(plist).toContain("<false/>");
    expect(plist).toContain(
      "<string>/Applications/Tumiki.app/Contents/MacOS/Tumiki</string>",
    );
    expect(plist).toContain("<string>--telemetry-receiver</string>");
    expect(plist).toContain("telemetry-receiver.out.log");
    expect(plist).toContain("telemetry-receiver.err.log");
  });
});
