import { describe, expect, test } from "vitest";
import { resolveDesktopAppMode } from "../app-mode";

describe("resolveDesktopAppMode", () => {
  test("--mcp-proxy は MCP proxy mode を返す", () => {
    expect(resolveDesktopAppMode(["Tumiki", "--mcp-proxy"])).toStrictEqual(
      "mcp-proxy",
    );
  });

  test("--telemetry-receiver は telemetry receiver mode を返す", () => {
    expect(
      resolveDesktopAppMode(["Tumiki", "--telemetry-receiver"]),
    ).toStrictEqual("telemetry-receiver");
  });

  test("特別な flag がなければ GUI mode を返す", () => {
    expect(resolveDesktopAppMode(["Tumiki"])).toStrictEqual("gui");
  });
});
