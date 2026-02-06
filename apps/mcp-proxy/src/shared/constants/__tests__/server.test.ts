import { describe, test, expect } from "vitest";
import {
  DEFAULT_PORT,
  LOG_LEVELS,
  DEFAULT_LOG_LEVEL,
  DEFAULT_MCP_TIMEOUT,
} from "../server.js";

describe("サーバー定数", () => {
  test("DEFAULT_PORTが8080である", () => {
    expect(DEFAULT_PORT).toBe(8080);
  });

  test("LOG_LEVELSにinfo, warn, error, debugが含まれる", () => {
    expect(LOG_LEVELS).toStrictEqual(["info", "warn", "error", "debug"]);
  });

  test("DEFAULT_LOG_LEVELがinfoである", () => {
    expect(DEFAULT_LOG_LEVEL).toBe("info");
  });

  test("DEFAULT_MCP_TIMEOUTが120000ミリ秒である", () => {
    expect(DEFAULT_MCP_TIMEOUT).toBe(120000);
  });
});
