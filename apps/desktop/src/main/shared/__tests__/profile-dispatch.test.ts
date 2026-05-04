import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));

vi.mock("../profile-store", () => ({
  getProfileState: vi.fn(),
}));

import { resolveByProfile } from "../profile-dispatch";
import { getProfileState } from "../profile-store";

describe("resolveByProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("組織利用モードではorganizationハンドラーを実行する", async () => {
    vi.mocked(getProfileState).mockResolvedValue({
      activeProfile: "organization",
      organizationProfile: {
        managerUrl: "https://manager.example.com",
        connectedAt: "2026-01-01T00:00:00.000Z",
      },
      hasCompletedInitialProfileSetup: true,
    });

    const personal = vi.fn().mockResolvedValue("personal-data");
    const organization = vi.fn().mockResolvedValue("organization-data");

    const result = await resolveByProfile({ personal, organization });

    expect(result).toBe("organization-data");
    expect(organization).toHaveBeenCalledOnce();
    expect(personal).not.toHaveBeenCalled();
  });

  test("個人利用モードではpersonalハンドラーを実行する", async () => {
    vi.mocked(getProfileState).mockResolvedValue({
      activeProfile: "personal",
      organizationProfile: null,
      hasCompletedInitialProfileSetup: true,
    });

    const personal = vi.fn().mockResolvedValue("personal-data");
    const organization = vi.fn().mockResolvedValue("organization-data");

    const result = await resolveByProfile({ personal, organization });

    expect(result).toBe("personal-data");
    expect(personal).toHaveBeenCalledOnce();
    expect(organization).not.toHaveBeenCalled();
  });

  test("プロファイル未設定時はpersonalハンドラーにフォールバックする", async () => {
    vi.mocked(getProfileState).mockResolvedValue({
      activeProfile: null,
      organizationProfile: null,
      hasCompletedInitialProfileSetup: false,
    });

    const personal = vi.fn().mockResolvedValue("fallback-data");
    const organization = vi.fn().mockResolvedValue("organization-data");

    const result = await resolveByProfile({ personal, organization });

    expect(result).toBe("fallback-data");
    expect(personal).toHaveBeenCalledOnce();
    expect(organization).not.toHaveBeenCalled();
  });

  test("ハンドラーの戻り値をそのまま返す", async () => {
    vi.mocked(getProfileState).mockResolvedValue({
      activeProfile: "organization",
      organizationProfile: {
        managerUrl: "https://manager.example.com",
        connectedAt: "2026-01-01T00:00:00.000Z",
      },
      hasCompletedInitialProfileSetup: true,
    });

    const complexData = [
      { id: 1, name: "item1" },
      { id: 2, name: "item2" },
    ];
    const organization = vi.fn().mockResolvedValue(complexData);
    const personal = vi.fn();

    const result = await resolveByProfile({ personal, organization });

    expect(result).toStrictEqual(complexData);
  });
});
