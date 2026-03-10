import { describe, expect, test } from "vitest";

import { normalizeServerName } from "../normalizeServerName.js";

describe("normalizeServerName", () => {
  test("小文字に変換する", () => {
    expect(normalizeServerName("MyServer")).toBe("myserver");
    expect(normalizeServerName("MY_SERVER")).toBe("myserver");
  });

  test("空白をハイフンに変換する", () => {
    expect(normalizeServerName("my server")).toBe("my-server");
    expect(normalizeServerName("my  server")).toBe("my-server");
    expect(normalizeServerName("my   server")).toBe("my-server");
  });

  test("ASCII文字、数字、ハイフン以外を削除する", () => {
    expect(normalizeServerName("my@server!")).toBe("myserver");
    expect(normalizeServerName("サーバー")).toBe("");
    expect(normalizeServerName("server_name")).toBe("servername");
    expect(normalizeServerName("server.name")).toBe("servername");
  });

  test("連続するハイフンを1つにまとめる", () => {
    expect(normalizeServerName("my--server")).toBe("my-server");
    expect(normalizeServerName("my---server")).toBe("my-server");
  });

  test("先頭・末尾のハイフンを削除する", () => {
    expect(normalizeServerName("-myserver")).toBe("myserver");
    expect(normalizeServerName("myserver-")).toBe("myserver");
    expect(normalizeServerName("-myserver-")).toBe("myserver");
    expect(normalizeServerName("--myserver--")).toBe("myserver");
  });

  test("複合的なケースを処理する", () => {
    expect(normalizeServerName("My Server Name")).toBe("my-server-name");
    expect(normalizeServerName("  My  Server  ")).toBe("my-server");
    expect(normalizeServerName("Server@123!")).toBe("server123");
    expect(normalizeServerName("---My---Server---")).toBe("my-server");
  });

  test("数字を含む名前を処理する", () => {
    expect(normalizeServerName("server123")).toBe("server123");
    expect(normalizeServerName("123server")).toBe("123server");
    expect(normalizeServerName("server-123")).toBe("server-123");
  });

  test("空文字列を処理する", () => {
    expect(normalizeServerName("")).toBe("");
    expect(normalizeServerName("   ")).toBe("");
    expect(normalizeServerName("---")).toBe("");
  });
});
