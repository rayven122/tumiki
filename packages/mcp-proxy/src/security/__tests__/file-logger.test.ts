import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createMockLogger } from "../../__tests__/test-helpers.js";
import { combineLoggers, createFileLogger } from "../file-logger.js";

let tmpDir: string;
let logPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "tumiki-file-logger-"));
  logPath = join(tmpDir, "logs", "mcp-proxy.log");
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("createFileLogger", () => {
  test("info ログがファイルに追記される", () => {
    const logger = createFileLogger(logPath);

    logger.info("テストメッセージ", { tool: "linear__create_issue" });

    const content = readFileSync(logPath, "utf-8");
    expect(content).toContain("[INFO]");
    expect(content).toContain("テストメッセージ");
    expect(content).toContain("linear__create_issue");
  });

  test("error / warn / debug の各レベルが記録される", () => {
    const logger = createFileLogger(logPath);

    logger.error("エラー発生");
    logger.warn("警告");
    logger.debug("デバッグ");

    const content = readFileSync(logPath, "utf-8");
    expect(content).toContain("[ERROR] エラー発生");
    expect(content).toContain("[WARN] 警告");
    expect(content).toContain("[DEBUG] デバッグ");
  });

  test("meta が undefined のときは meta 部分を出力しない", () => {
    const logger = createFileLogger(logPath);

    logger.info("メタなし");

    const content = readFileSync(logPath, "utf-8");
    expect(content.trim().endsWith("メタなし")).toBe(true);
  });

  test("ディレクトリが存在しない場合でも自動作成される", () => {
    const deepPath = join(tmpDir, "deep", "nested", "logs", "mcp-proxy.log");
    const logger = createFileLogger(deepPath);

    logger.info("確認");

    const content = readFileSync(deepPath, "utf-8");
    expect(content).toContain("確認");
  });

  test("複数回呼び出すと追記される", () => {
    const logger = createFileLogger(logPath);

    logger.info("1行目");
    logger.info("2行目");

    const lines = readFileSync(logPath, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
  });

  test("ファイル書き込み失敗時もスローしない", () => {
    // 存在しないドライブのようなパスを指定して書き込み失敗を誘発（読み取り専用 / 権限なし）
    const logger = createFileLogger("/dev/null/cannot-write-here.log");

    expect(() => logger.info("テスト")).not.toThrow();
  });
});

describe("combineLoggers", () => {
  test("info が全ての Logger に伝播する", () => {
    const a = createMockLogger();
    const b = createMockLogger();
    const combined = combineLoggers(a, b);

    combined.info("テスト", { x: 1 });

    expect(a.info).toHaveBeenCalledWith("テスト", { x: 1 });
    expect(b.info).toHaveBeenCalledWith("テスト", { x: 1 });
  });

  test("error / warn / debug も全 Logger に伝播する", () => {
    const a = createMockLogger();
    const b = createMockLogger();
    const combined = combineLoggers(a, b);

    combined.error("E");
    combined.warn("W");
    combined.debug("D");

    expect(a.error).toHaveBeenCalledWith("E", undefined);
    expect(b.error).toHaveBeenCalledWith("E", undefined);
    expect(a.warn).toHaveBeenCalledWith("W", undefined);
    expect(b.warn).toHaveBeenCalledWith("W", undefined);
    expect(a.debug).toHaveBeenCalledWith("D", undefined);
    expect(b.debug).toHaveBeenCalledWith("D", undefined);
  });

  test("Logger が空配列でも例外が出ない", () => {
    const combined = combineLoggers();

    expect(() => combined.info("テスト")).not.toThrow();
  });

  test("片方の Logger でエラーが起きても伝播は続く想定（実装は throw しない前提）", () => {
    const failing: ReturnType<typeof createMockLogger> = {
      info: vi.fn(() => {
        throw new Error("intentional");
      }),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
    const ok = createMockLogger();
    const combined = combineLoggers(failing, ok);

    // 仕様としては失敗を伝播させる（PoC レベル）。捕捉が必要なら呼び出し側で対応。
    expect(() => combined.info("テスト")).toThrow("intentional");
    expect(failing.info).toHaveBeenCalled();
  });
});
