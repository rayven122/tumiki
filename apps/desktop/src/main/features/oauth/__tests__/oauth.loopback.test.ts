import { describe, test, expect } from "vitest";
import { startLoopbackServer, LOOPBACK_PORT_IN_USE } from "../oauth.loopback";

// テストは並列実行で衝突しないように port: 0 でOS割当ポートを使用する。
// 本番デフォルト（固定ポート）は別途E2E or 起動時の実機検証で確認する。
const TEST_OPTIONS = { port: 0 };

describe("oauth.loopback", () => {
  test("port:0 指定時にOS割当ポートで起動しredirectUriを返す", async () => {
    const server = await startLoopbackServer(TEST_OPTIONS);
    try {
      const url = new URL(server.redirectUri);
      expect(url.protocol).toBe("http:");
      expect(url.hostname).toBe("127.0.0.1");
      expect(url.pathname).toBe("/callback");
      expect(Number(url.port)).toBeGreaterThan(0);
    } finally {
      await server.close();
    }
  });

  test("/callbackへのリクエストで認可コードを受信する", async () => {
    const server = await startLoopbackServer(TEST_OPTIONS);
    try {
      const callbackPromise = server.waitForCallback(5_000);
      const target = new URL(server.redirectUri);
      target.searchParams.set("code", "abc");
      target.searchParams.set("state", "xyz");

      const res = await fetch(target.toString());
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("認証完了");

      const callbackUrl = await callbackPromise;
      const parsed = new URL(callbackUrl);
      expect(parsed.searchParams.get("code")).toBe("abc");
      expect(parsed.searchParams.get("state")).toBe("xyz");
    } finally {
      await server.close();
    }
  });

  test("OAuthエラーパラメータを含むコールバックも受信する", async () => {
    const server = await startLoopbackServer(TEST_OPTIONS);
    try {
      const callbackPromise = server.waitForCallback(5_000);
      const target = new URL(server.redirectUri);
      target.searchParams.set("error", "access_denied");

      const res = await fetch(target.toString());
      expect(res.status).toBe(200);

      const callbackUrl = await callbackPromise;
      expect(new URL(callbackUrl).searchParams.get("error")).toBe(
        "access_denied",
      );
    } finally {
      await server.close();
    }
  });

  test("/callback以外は404を返す", async () => {
    const server = await startLoopbackServer(TEST_OPTIONS);
    try {
      const url = new URL(server.redirectUri);
      const res = await fetch(`http://${url.host}/other`);
      expect(res.status).toBe(404);
    } finally {
      await server.close();
    }
  });

  test("タイムアウト時にrejectする", async () => {
    const server = await startLoopbackServer(TEST_OPTIONS);
    try {
      await expect(server.waitForCallback(100)).rejects.toThrow(
        "OAuth認証がタイムアウトしました",
      );
    } finally {
      await server.close();
    }
  });

  test("close は冪等に呼び出せる", async () => {
    const server = await startLoopbackServer(TEST_OPTIONS);
    await server.close();
    await expect(server.close()).resolves.not.toThrow();
  });

  test("ポート占有時に LOOPBACK_PORT_IN_USE エラーを投げる", async () => {
    const first = await startLoopbackServer(TEST_OPTIONS);
    const port = Number(new URL(first.redirectUri).port);
    try {
      await expect(startLoopbackServer({ port })).rejects.toMatchObject({
        code: LOOPBACK_PORT_IN_USE,
      });
    } finally {
      await first.close();
    }
  });
});
