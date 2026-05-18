import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockVerifyDesktopJwt = vi.hoisted(() => vi.fn());

vi.mock("../verify-desktop-jwt", () => ({
  verifyDesktopJwt: mockVerifyDesktopJwt,
}));

import { withDesktopAuth } from "../with-desktop-auth";
import type { NextRequest } from "next/server";

const makeRequest = (authHeader?: string) =>
  ({
    headers: {
      get: (name: string) =>
        name === "Authorization" ? (authHeader ?? null) : null,
    },
  }) as unknown as NextRequest;

const makeVerifiedUser = () => ({
  sub: "keycloak-sub-123",
  userId: "user-id-abc",
  orgSlug: "my-org",
});

describe("withDesktopAuth", () => {
  beforeEach(() => {
    mockVerifyDesktopJwt.mockResolvedValue(makeVerifiedUser());
  });

  describe("認証成功", () => {
    test("JWT検証成功時はハンドラーを呼び出してその結果を返す", async () => {
      const handlerResponse = NextResponse.json({ data: "ok" });
      const handler = vi.fn().mockResolvedValue(handlerResponse);

      const response = await withDesktopAuth(
        makeRequest("Bearer valid"),
        handler,
      );

      expect(handler).toHaveBeenCalledWith(makeVerifiedUser());
      expect(response).toBe(handlerResponse);
    });

    test("検証済みユーザー情報がハンドラーに渡される", async () => {
      let capturedUser: unknown;
      const handler = vi.fn().mockImplementation((user) => {
        capturedUser = user;
        return Promise.resolve(NextResponse.json({}));
      });

      await withDesktopAuth(makeRequest("Bearer valid"), handler);

      expect(capturedUser).toStrictEqual(makeVerifiedUser());
    });
  });

  describe("認証失敗", () => {
    test("JWT検証失敗時は401を返しハンドラーを呼ばない", async () => {
      mockVerifyDesktopJwt.mockRejectedValue(new Error("Unauthorized"));
      const handler = vi.fn();

      const response = await withDesktopAuth(
        makeRequest("Bearer invalid"),
        handler,
      );

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      const body: unknown = await response.json();
      expect(body).toStrictEqual({ error: "Unauthorized" });
    });

    test("Authorizationヘッダーがない場合も認証エラーを返す", async () => {
      mockVerifyDesktopJwt.mockRejectedValue(new Error("Unauthorized"));
      const handler = vi.fn();

      const response = await withDesktopAuth(makeRequest(), handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      const body: unknown = await response.json();
      expect(body).toStrictEqual({ error: "Unauthorized" });
    });
  });
});
