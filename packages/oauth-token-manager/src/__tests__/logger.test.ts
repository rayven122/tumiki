/**
 * logger.ts のテスト
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { logger } from "../logger.js";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test("infoレベルのログはconsole.infoに出力される", () => {
    logger.info("info message");

    expect(console.info).toHaveBeenCalledOnce();
    const call = vi.mocked(console.info).mock.calls[0];
    expect(call?.[0]).toContain("[INFO]");
    expect(call?.[0]).toContain("info message");
  });

  test("infoレベルのログにメタ情報を含む場合はJSONとして出力される", () => {
    logger.info("info with meta", { key: "value" });

    const call = vi.mocked(console.info).mock.calls[0];
    expect(call?.[0]).toContain('"key":"value"');
  });

  test("warnレベルのログはconsole.warnに出力される", () => {
    logger.warn("warn message");

    expect(console.warn).toHaveBeenCalledOnce();
    const call = vi.mocked(console.warn).mock.calls[0];
    expect(call?.[0]).toContain("[WARN]");
    expect(call?.[0]).toContain("warn message");
  });

  test("errorレベルのログはconsole.errorに出力される", () => {
    logger.error("error message");

    expect(console.error).toHaveBeenCalledOnce();
    const call = vi.mocked(console.error).mock.calls[0];
    expect(call?.[0]).toContain("[ERROR]");
    expect(call?.[0]).toContain("error message");
  });

  test("debugレベルのログはLOG_LEVEL=debugの場合にconsole.debugに出力される", () => {
    vi.stubEnv("LOG_LEVEL", "debug");

    logger.debug("debug message");

    expect(console.debug).toHaveBeenCalledOnce();
    const call = vi.mocked(console.debug).mock.calls[0];
    expect(call?.[0]).toContain("[DEBUG]");
    expect(call?.[0]).toContain("debug message");
  });

  test("debugレベルのログはLOG_LEVEL=debugでない場合は出力されない", () => {
    vi.stubEnv("LOG_LEVEL", "info");

    logger.debug("debug message");

    expect(console.debug).not.toHaveBeenCalled();
  });
});
