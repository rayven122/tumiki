import { describe, expect, test } from "vitest";
import { resolveDesktopAppMode } from "../app-mode";

describe("resolveDesktopAppMode", () => {
  test("--mcp-proxy は MCP proxy mode を返す", () => {
    expect(resolveDesktopAppMode(["Tumiki", "--mcp-proxy"])).toStrictEqual(
      "mcp-proxy",
    );
  });

  test("--analytics は telemetry receiver mode を返す", () => {
    expect(resolveDesktopAppMode(["Tumiki", "--analytics"])).toStrictEqual(
      "telemetry-receiver",
    );
  });

  test("--telemetry-receiver は互換 alias として telemetry receiver mode を返す", () => {
    expect(
      resolveDesktopAppMode(["Tumiki", "--telemetry-receiver"]),
    ).toStrictEqual("telemetry-receiver");
  });

  test("特別な flag がなければ GUI mode を返す", () => {
    expect(resolveDesktopAppMode(["Tumiki"])).toStrictEqual("gui");
  });
});
