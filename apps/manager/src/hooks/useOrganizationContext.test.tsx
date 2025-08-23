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

// window.location.reloadのモック
const mockReload = vi.fn();
Object.defineProperty(window, "location", {
  value: { reload: mockReload },
  writable: true,
});

// テスト用の組織データ
const mockOrganizations = [
  {
    id: "org_1" as OrganizationId,
    name: "Organization 1",
    isPersonal: false,
    isDefault: true,
    isAdmin: false,
    memberCount: 5,
  },
  {
    id: "org_2" as OrganizationId,
    name: "Organization 2",
    isPersonal: false,
    isDefault: false,
    isAdmin: true,
    memberCount: 10,
  },
  {
    id: "org_personal" as OrganizationId,
    name: "Personal Workspace",
    isPersonal: true,
    isDefault: false,
    isAdmin: true,
    memberCount: 1,
  },
];

describe("useOrganizationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mockUseUtilsのデフォルト実装
    mockUseUtils.mockReturnValue({
      organization: {
        getUserOrganizations: {
          invalidate: mockInvalidate,
        },
      },
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
      isDefault: true,
      isAdmin: false,
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

  test("組織切り替えが成功する", () => {
    // モック関数を明示的にクリア
    mockToastSuccess.mockClear();
    mockReload.mockClear();

    mockUseQuery.mockReturnValue({
      data: mockOrganizations,
      isLoading: false,
    });

    // mutationのモックを直接設定
    const mockMutate = vi.fn();
    let capturedOnSuccess: (() => void) | undefined;

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

    // 成功コールバックを手動でトリガー
    act(() => {
      if (capturedOnSuccess) {
        capturedOnSuccess();
      }
    });

    // 成功コールバックが呼ばれたことを確認
    expect(mockToastSuccess).toHaveBeenCalledWith("組織を切り替えました");
    expect(mockReload).toHaveBeenCalled();
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
    mockReload.mockClear();

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

    expect(mockReload).not.toHaveBeenCalled();
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
