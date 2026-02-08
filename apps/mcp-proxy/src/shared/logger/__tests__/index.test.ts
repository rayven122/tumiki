import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { log, logInfo, logWarn, logError, logDebug } from "../index.js";

describe("log", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  test("本番モードではJSON形式で出力する", () => {
    vi.stubEnv("NODE_ENV", "production");

    log("info", "test message", { key: "value" });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const output = consoleSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.key).toBe("value");
    expect(parsed.timestamp).toBeDefined();
  });

  test("開発モードでは読みやすい形式で出力する", () => {
    vi.stubEnv("NODE_ENV", "development");

    log("warn", "warning message", { detail: "info" });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith("[WARN] warning message", {
      detail: "info",
    });
  });

  test("metadataがない場合は空文字が出力される", () => {
    vi.stubEnv("NODE_ENV", "development");

    log("info", "no metadata");

    expect(consoleSpy).toHaveBeenCalledWith("[INFO] no metadata", "");
  });
});

describe("logInfo", () => {
  test("infoレベルでログを出力する", () => {
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "development");

    logInfo("info message", { key: "val" });

    expect(consoleSpy).toHaveBeenCalledWith("[INFO] info message", {
      key: "val",
    });

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});

describe("logWarn", () => {
  test("warnレベルでログを出力する", () => {
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "development");

    logWarn("warn message");

    expect(consoleSpy).toHaveBeenCalledWith("[WARN] warn message", "");

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});

describe("logError", () => {
  test("エラーメッセージとスタックトレースを含む", () => {
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "development");

    const error = new Error("test error");
    logError("error occurred", error, { context: "test" });

    expect(consoleSpy).toHaveBeenCalledWith(
      "[ERROR] error occurred",
      expect.objectContaining({
        errorMessage: "test error",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        stack: expect.any(String),
        context: "test",
      }),
    );

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});

describe("logDebug", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  test("開発環境では出力する", () => {
    vi.stubEnv("NODE_ENV", "development");

    logDebug("debug message");

    expect(consoleSpy).toHaveBeenCalled();
  });

  test("本番環境でLOG_LEVEL=debugの場合は出力する", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOG_LEVEL", "debug");

    logDebug("debug in prod");

    expect(consoleSpy).toHaveBeenCalled();
  });

  test("本番環境でLOG_LEVEL未設定の場合は出力しない", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOG_LEVEL", "");

    logDebug("should not appear");

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
