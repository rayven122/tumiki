/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, vi, type Mock } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import * as React from "react";
import { type ReactNode } from "react";
import {
  OrganizationProvider,
  useOrganizationContext,
} from "./useOrganizationContext";
import { type OrganizationId } from "@/schema/ids";

// Reactをグローバルに設定（モック内で使用するため）
(globalThis as any).React = React;

// モック関数を定義
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockInvalidate = vi.fn();
const mockUseUtils = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockUseSession = vi.fn();
const mockUpdate = vi.fn();
const mockRouterPush = vi.fn();

// tRPC APIのモック
vi.mock("@/trpc/react", () => ({
  api: {
    organization: {
      getUserOrganizations: {
        useQuery: () => mockUseQuery(),
      },
      setDefaultOrganization: {
        useMutation: (options: any) => mockUseMutation(options),
      },
    },
    useUtils: () => mockUseUtils(),
  },
}));

// toastのモック
vi.mock("@/utils/client/toast", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// next-authのモック
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  SessionProvider: ({ children }: { children: ReactNode }) => children,
}));

// next/navigationのモック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  usePathname: () => "/org_1/mcps",
}));

// テスト用の組織データ
const mockOrganizations = [
  {
    id: "org_1" as OrganizationId,
    name: "Organization 1",
    isPersonal: false,
    isDefault: true,
    memberCount: 5,
  },
  {
    id: "org_2" as OrganizationId,
    name: "Organization 2",
    isPersonal: false,
    isDefault: false,
    memberCount: 10,
  },
  {
    id: "org_personal" as OrganizationId,
    name: "Personal Workspace",
    isPersonal: true,
    isDefault: false,
    memberCount: 1,
  },
];

describe("useOrganizationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mockUseUtilsのデフォルト実装
    mockUseUtils.mockReturnValue({
      invalidate: mockInvalidate,
    });
    // mockUseSessionのデフォルト実装
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user_1",
          email: "test@example.com",
          tumiki: {
            org_id: "org_1",
            org_slug: "org-1-slug",
            org_slugs: ["org-1-slug"],
            roles: [],
          },
        },
      },
      status: "authenticated",
      update: mockUpdate,
    });
  });

  test("コンテキスト外で使用するとエラーが発生する", () => {
    // コンソールエラーを抑制
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      renderHook(() => useOrganizationContext());
    }).toThrow(
      "useOrganizationContext must be used within an OrganizationProvider",
    );

    console.error = originalError;
  });

  test("初期状態で現在の組織が正しく設定される", () => {
    mockUseQuery.mockReturnValue({
      data: mockOrganizations,
      isLoading: false,
    });

    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    );

    const { result } = renderHook(() => useOrganizationContext(), { wrapper });

    expect(result.current.currentOrganization).toStrictEqual({
      id: "org_1",
      name: "Organization 1",
      isPersonal: false,
      memberCount: 5,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSwitching).toBe(false);
  });

  test("ローディング状態が正しく表示される", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    );

    const { result } = renderHook(() => useOrganizationContext(), { wrapper });

    expect(result.current.currentOrganization).toBe(null);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSwitching).toBe(false);
  });

  test("組織切り替えが成功する", async () => {
    // モック関数を明示的にクリア
    mockToastSuccess.mockClear();
    mockUpdate.mockClear();
    mockInvalidate.mockClear();
    mockRouterPush.mockClear();

    // updateとinvalidateは成功を返すようにモック
    mockUpdate.mockResolvedValue(undefined);
    mockInvalidate.mockResolvedValue(undefined);

    mockUseQuery.mockReturnValue({
      data: mockOrganizations,
      isLoading: false,
    });

    // mutationのモックを直接設定
    const mockMutate = vi.fn();
    let capturedOnSuccess:
      | ((data: { organizationSlug: string }) => Promise<void>)
      | undefined;

    mockUseMutation.mockImplementation((options) => {
      capturedOnSuccess = options?.onSuccess;
      return {
        mutate: mockMutate,
        isPending: false,
      };
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    );

    const { result } = renderHook(() => useOrganizationContext(), { wrapper });

    act(() => {
      result.current.setCurrentOrganization("org_2" as OrganizationId);
    });

    // mutate が呼ばれたことを確認
    expect(mockMutate).toHaveBeenCalledWith({
      organizationId: "org_2",
    });

    // 成功コールバックを手動でトリガー（organizationSlugを含むデータを渡す）
    await act(async () => {
      if (capturedOnSuccess) {
        await capturedOnSuccess({ organizationSlug: "org-2-slug" });
      }
    });

    // 成功コールバックが呼ばれたことを確認
    expect(mockToastSuccess).toHaveBeenCalledWith("組織を切り替えました");
    // Auth.jsのセッション更新が呼ばれたことを確認
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    // tRPCキャッシュの全無効化が呼ばれたことを確認
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    // router.pushで新しいorgSlugのURLへ遷移することを確認
    expect(mockRouterPush).toHaveBeenCalledWith("/org-2-slug/mcps");
  });

  test("存在しない組織への切り替えがエラーになる", () => {
    mockUseQuery.mockReturnValue({
      data: mockOrganizations,
      isLoading: false,
    });

    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    );

    const { result } = renderHook(() => useOrganizationContext(), { wrapper });

    act(() => {
      result.current.setCurrentOrganization("org_invalid" as OrganizationId);
    });

    expect(mockToastError).toHaveBeenCalledWith("組織が見つかりません");
  });

  test("組織切り替えのエラーが正しく処理される", () => {
    const errorMessage = "権限がありません";

    // モック関数を明示的にクリア
    mockToastError.mockClear();
    mockRouterPush.mockClear();

    mockUseQuery.mockReturnValue({
      data: mockOrganizations,
      isLoading: false,
    });

    // mutationのモックを直接設定
    const mockMutate = vi.fn();
    let capturedOnError: ((error: { message: string }) => void) | undefined;

    mockUseMutation.mockImplementation((options) => {
      capturedOnError = options?.onError;
      return {
        mutate: mockMutate,
        isPending: false,
      };
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    );

    const { result } = renderHook(() => useOrganizationContext(), { wrapper });

    act(() => {
      result.current.setCurrentOrganization("org_2" as OrganizationId);
    });

    // mutate が呼ばれたことを確認
    expect(mockMutate).toHaveBeenCalledWith({
      organizationId: "org_2",
    });

    // エラーコールバックを手動でトリガー
    act(() => {
      if (capturedOnError) {
        capturedOnError({ message: errorMessage });
      }
    });

    // エラーコールバックが呼ばれたことを確認
    expect(mockToastError).toHaveBeenCalledWith(
      `組織の切り替えに失敗しました: ${errorMessage}`,
    );

    // エラー時はrouter.pushが呼ばれないことを確認
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test("切り替え中の状態が正しく反映される", () => {
    mockUseQuery.mockReturnValue({
      data: mockOrganizations,
      isLoading: false,
    });

    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: true, // 切り替え中
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    );

    const { result } = renderHook(() => useOrganizationContext(), { wrapper });

    expect(result.current.isSwitching).toBe(true);
  });

  test("デフォルト組織がない場合はnullが返される", () => {
    const organizationsWithoutDefault = mockOrganizations.map((org) => ({
      ...org,
      isDefault: false,
    }));

    mockUseQuery.mockReturnValue({
      data: organizationsWithoutDefault,
      isLoading: false,
    });

    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    // セッションのorg_idをnullに設定
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user_1",
          email: "test@example.com",
          tumiki: {
            org_id: null,
            org_slug: null,
            org_slugs: [],
            roles: [],
          },
        },
      },
      status: "authenticated",
      update: mockUpdate,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    );

    const { result } = renderHook(() => useOrganizationContext(), { wrapper });

    expect(result.current.currentOrganization).toBe(null);
  });

  test("組織データが空の場合はnullが返される", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    );

    const { result } = renderHook(() => useOrganizationContext(), { wrapper });

    expect(result.current.currentOrganization).toBe(null);
  });

  test("組織データがundefinedの場合はnullが返される", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    );

    const { result } = renderHook(() => useOrganizationContext(), { wrapper });

    expect(result.current.currentOrganization).toBe(null);
  });
});
