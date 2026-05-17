import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../../../utils/credentials");
vi.mock("../oauth.refresh");

import { getDb } from "../../../shared/db";
import { decryptCredentials } from "../../../utils/credentials";
import { refreshOAuthTokenIfNeeded } from "../oauth.refresh";
import {
  clearCredentialsCache,
  getCachedCredentials,
} from "../credentials-cache";
import {
  refreshAllOAuthSecrets,
  startOAuthRefreshScheduler,
  stopOAuthRefreshScheduler,
} from "../oauth.scheduler";

type ConnectionRow = {
  secretId: number;
  url: string | null;
  secret: { credentials: string };
};

const buildDb = (connections: ConnectionRow[]) =>
  ({
    mcpConnection: {
      findMany: vi.fn().mockResolvedValue(connections),
    },
  }) as unknown as Awaited<ReturnType<typeof getDb>>;

describe("oauth.scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCredentialsCache();
    vi.mocked(decryptCredentials).mockImplementation(async (v) =>
      v.startsWith("enc:") ? v.slice(4) : v,
    );
  });

  afterEach(() => {
    stopOAuthRefreshScheduler();
    vi.useRealTimers();
  });

  describe("refreshAllOAuthSecrets", () => {
    test("refresh が新トークンを返した場合 cache に新トークンが入る", async () => {
      vi.mocked(getDb).mockResolvedValue(
        buildDb([
          {
            secretId: 1,
            url: "https://example.com/mcp",
            secret: {
              credentials: 'enc:{"access_token":"old","refresh_token":"r"}',
            },
          },
        ]),
      );
      vi.mocked(refreshOAuthTokenIfNeeded).mockResolvedValue({
        access_token: "new",
        refresh_token: "r2",
      });

      await refreshAllOAuthSecrets();

      expect(getCachedCredentials(1)).toStrictEqual({
        access_token: "new",
        refresh_token: "r2",
      });
    });

    test("refresh 不要（null 返却）でも cache は現在値で初期化される", async () => {
      vi.mocked(getDb).mockResolvedValue(
        buildDb([
          {
            secretId: 2,
            url: "https://example.com/mcp",
            secret: {
              credentials:
                'enc:{"access_token":"still-valid","refresh_token":"r"}',
            },
          },
        ]),
      );
      vi.mocked(refreshOAuthTokenIfNeeded).mockResolvedValue(null);

      await refreshAllOAuthSecrets();

      expect(getCachedCredentials(2)).toStrictEqual({
        access_token: "still-valid",
        refresh_token: "r",
      });
    });

    test("同一 secretId を共有する複数接続は 1 回だけ refresh される", async () => {
      vi.mocked(getDb).mockResolvedValue(
        buildDb([
          {
            secretId: 3,
            url: "https://example.com/mcp",
            secret: { credentials: 'enc:{"access_token":"a"}' },
          },
          {
            secretId: 3,
            url: "https://example.com/mcp",
            secret: { credentials: 'enc:{"access_token":"a"}' },
          },
        ]),
      );
      vi.mocked(refreshOAuthTokenIfNeeded).mockResolvedValue(null);

      await refreshAllOAuthSecrets();

      expect(refreshOAuthTokenIfNeeded).toHaveBeenCalledTimes(1);
    });

    test("url が null の接続はスキップされる", async () => {
      vi.mocked(getDb).mockResolvedValue(
        buildDb([
          {
            secretId: 4,
            url: null,
            secret: { credentials: 'enc:{"access_token":"a"}' },
          },
        ]),
      );

      await refreshAllOAuthSecrets();

      expect(refreshOAuthTokenIfNeeded).not.toHaveBeenCalled();
      expect(getCachedCredentials(4)).toBeUndefined();
    });

    test("1 secret の例外は握り潰され、他の secret 処理は継続する", async () => {
      vi.mocked(getDb).mockResolvedValue(
        buildDb([
          {
            secretId: 5,
            url: "https://a.example.com/mcp",
            secret: { credentials: 'enc:{"access_token":"a"}' },
          },
          {
            secretId: 6,
            url: "https://b.example.com/mcp",
            secret: { credentials: 'enc:{"access_token":"b"}' },
          },
        ]),
      );
      vi.mocked(refreshOAuthTokenIfNeeded)
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce({ access_token: "b-refreshed" });

      await refreshAllOAuthSecrets();

      expect(getCachedCredentials(5)).toBeUndefined();
      expect(getCachedCredentials(6)).toStrictEqual({
        access_token: "b-refreshed",
      });
    });
  });

  describe("startOAuthRefreshScheduler", () => {
    test("起動直後に 1 回 refresh が走る", async () => {
      vi.mocked(getDb).mockResolvedValue(buildDb([]));

      startOAuthRefreshScheduler(60_000);
      // 起動直後の非同期 refresh が完了するのを待つ
      await new Promise((resolve) => setImmediate(resolve));

      const db = await getDb();
      expect(
        (db.mcpConnection.findMany as ReturnType<typeof vi.fn>).mock.calls
          .length,
      ).toBeGreaterThanOrEqual(1);
    });

    test("指定間隔ごとに refresh が走る", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      vi.mocked(getDb).mockResolvedValue(buildDb([]));

      startOAuthRefreshScheduler(10_000);
      // 初回実行を消化
      await vi.runOnlyPendingTimersAsync();

      const db = await getDb();
      const beforeAdvance = (
        db.mcpConnection.findMany as ReturnType<typeof vi.fn>
      ).mock.calls.length;

      await vi.advanceTimersByTimeAsync(10_000);
      await vi.advanceTimersByTimeAsync(10_000);

      const afterAdvance = (
        db.mcpConnection.findMany as ReturnType<typeof vi.fn>
      ).mock.calls.length;
      expect(afterAdvance).toBeGreaterThanOrEqual(beforeAdvance + 2);
    });

    test("stopOAuthRefreshScheduler 後は定期実行が止まる", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      vi.mocked(getDb).mockResolvedValue(buildDb([]));

      startOAuthRefreshScheduler(10_000);
      await vi.runOnlyPendingTimersAsync();

      const db = await getDb();
      const before = (db.mcpConnection.findMany as ReturnType<typeof vi.fn>)
        .mock.calls.length;

      stopOAuthRefreshScheduler();
      await vi.advanceTimersByTimeAsync(30_000);

      const after = (db.mcpConnection.findMany as ReturnType<typeof vi.fn>).mock
        .calls.length;
      expect(after).toBe(before);
    });
  });
});
