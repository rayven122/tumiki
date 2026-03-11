import { describe, test, expect } from "vitest";
import { createProcessKey } from "../processKey.js";

describe("createProcessKey", () => {
  test("サーバー名と環境変数からプロセスキーを生成する", () => {
    const key = createProcessKey("deepl", { API_KEY: "test-key" });

    expect(key.serverName).toBe("deepl");
    expect(key.envHash).toHaveLength(8);
    expect(key.value).toBe(`deepl:${key.envHash}`);
  });

  test("同じ入力からは同じキーが生成される", () => {
    const key1 = createProcessKey("deepl", { API_KEY: "test-key" });
    const key2 = createProcessKey("deepl", { API_KEY: "test-key" });

    expect(key1.value).toBe(key2.value);
  });

  test("異なる環境変数からは異なるキーが生成される", () => {
    const key1 = createProcessKey("deepl", { API_KEY: "key-1" });
    const key2 = createProcessKey("deepl", { API_KEY: "key-2" });

    expect(key1.value).not.toBe(key2.value);
  });

  test("環境変数の順序が異なっても同じキーが生成される", () => {
    const key1 = createProcessKey("server", { A: "1", B: "2" });
    const key2 = createProcessKey("server", { B: "2", A: "1" });

    expect(key1.value).toBe(key2.value);
  });

  test("空の環境変数でも正常に動作する", () => {
    const key = createProcessKey("server", {});

    expect(key.serverName).toBe("server");
    expect(key.envHash).toHaveLength(8);
  });
});
