import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModelSelector } from "./useModelSelector";

// モック
vi.mock("@/features/chat/services/ai/index.client", () => ({
  chatModels: [
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      description: "高性能モデル",
    },
    {
      id: "anthropic/claude-3.5-haiku",
      name: "Claude 3.5 Haiku",
      description: "高速モデル",
    },
    {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      description: "OpenAIモデル",
    },
  ],
  DEFAULT_CHAT_MODEL: "anthropic/claude-3.5-sonnet",
  getModelsGroupedByProvider: () => [
    {
      provider: "anthropic",
      label: "Anthropic",
      models: [
        {
          id: "anthropic/claude-3.5-sonnet",
          name: "Claude 3.5 Sonnet",
          description: "高性能モデル",
        },
        {
          id: "anthropic/claude-3.5-haiku",
          name: "Claude 3.5 Haiku",
          description: "高速モデル",
        },
      ],
    },
    {
      provider: "openai",
      label: "OpenAI",
      models: [
        { id: "openai/gpt-4o", name: "GPT-4o", description: "OpenAIモデル" },
      ],
    },
  ],
  entitlementsByUserType: {
    regular: {
      availableChatModelIds: [
        "anthropic/claude-3.5-sonnet",
        "anthropic/claude-3.5-haiku",
        "openai/gpt-4o",
      ],
    },
  },
}));

describe("useModelSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("初期状態で正しい値を返す", () => {
    const { result } = renderHook(() =>
      useModelSelector({
        selectedModelId: "anthropic/claude-3.5-sonnet",
      }),
    );

    expect(result.current.open).toBe(false);
    expect(result.current.isAutoSelected).toBe(false);
    expect(result.current.selectedDisplayName).toBe("Claude 3.5 Sonnet");
    expect(result.current.optimisticModelId).toBe(
      "anthropic/claude-3.5-sonnet",
    );
  });

  test("自動選択モデルの場合、isAutoSelectedがtrueになる", () => {
    const { result } = renderHook(() =>
      useModelSelector({
        selectedModelId: "auto",
      }),
    );

    expect(result.current.isAutoSelected).toBe(true);
    expect(result.current.selectedDisplayName).toBe("自動");
  });

  test("groupedModelsが利用可能なモデルのみを含む", () => {
    const { result } = renderHook(() =>
      useModelSelector({
        selectedModelId: "anthropic/claude-3.5-sonnet",
      }),
    );

    expect(result.current.groupedModels).toHaveLength(2);
    expect(result.current.groupedModels[0]?.provider).toBe("anthropic");
    expect(result.current.groupedModels[0]?.models).toHaveLength(2);
    expect(result.current.groupedModels[1]?.provider).toBe("openai");
    expect(result.current.groupedModels[1]?.models).toHaveLength(1);
  });

  test("handleSelectModelでコールバックが呼ばれる", () => {
    const onModelChange = vi.fn();
    const { result } = renderHook(() =>
      useModelSelector({
        selectedModelId: "anthropic/claude-3.5-sonnet",
        onModelChange,
      }),
    );

    act(() => {
      result.current.handleSelectModel("anthropic/claude-3.5-haiku");
    });

    expect(onModelChange).toHaveBeenCalledWith("anthropic/claude-3.5-haiku");
  });

  test("handleSelectModelでopenがfalseになる", () => {
    const { result } = renderHook(() =>
      useModelSelector({
        selectedModelId: "anthropic/claude-3.5-sonnet",
      }),
    );

    // 先にopenをtrueにする
    act(() => {
      result.current.setOpen(true);
    });
    expect(result.current.open).toBe(true);

    // モデル選択でopenがfalseになる
    act(() => {
      result.current.handleSelectModel("anthropic/claude-3.5-haiku");
    });
    expect(result.current.open).toBe(false);
  });

  test("利用不可能なモデルIDの場合、デフォルトモデル名を返す", () => {
    const { result } = renderHook(() =>
      useModelSelector({
        selectedModelId: "unknown/model",
      }),
    );

    expect(result.current.selectedDisplayName).toBe("Claude 3.5 Sonnet");
  });
});
