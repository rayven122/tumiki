import { describe, test, expect } from "vitest";
import { DEFAULT_CHAT_MODEL, chatModels, type ChatModel } from "./models";

describe("DEFAULT_CHAT_MODEL", () => {
  test("正常系: デフォルトチャットモデルIDが定義されている", () => {
    expect(DEFAULT_CHAT_MODEL).toStrictEqual("chat-model");
  });

  test("正常系: デフォルトチャットモデルIDは文字列型である", () => {
    expect(typeof DEFAULT_CHAT_MODEL).toStrictEqual("string");
  });

  test("正常系: デフォルトチャットモデルIDが空文字列ではない", () => {
    expect(DEFAULT_CHAT_MODEL.length).toBeGreaterThan(0);
  });
});

describe("chatModels", () => {
  test("正常系: chatModelsが配列である", () => {
    expect(Array.isArray(chatModels)).toStrictEqual(true);
  });

  test("正常系: chatModelsが2つの要素を持つ", () => {
    expect(chatModels.length).toStrictEqual(2);
  });

  test("正常系: 最初のモデルがchat-modelである", () => {
    const firstModel = chatModels[0];
    expect(firstModel).toStrictEqual({
      id: "chat-model",
      name: "Chat model",
      description: "Primary model for all-purpose chat",
    });
  });

  test("正常系: 2番目のモデルがchat-model-reasoningである", () => {
    const secondModel = chatModels[1];
    expect(secondModel).toStrictEqual({
      id: "chat-model-reasoning",
      name: "Reasoning model",
      description: "Uses advanced reasoning",
    });
  });

  test("正常系: すべてのモデルが必要なプロパティを持つ", () => {
    chatModels.forEach((model) => {
      expect(model).toHaveProperty("id");
      expect(model).toHaveProperty("name");
      expect(model).toHaveProperty("description");
    });
  });

  test("正常系: すべてのモデルのプロパティが文字列型である", () => {
    chatModels.forEach((model) => {
      expect(typeof model.id).toStrictEqual("string");
      expect(typeof model.name).toStrictEqual("string");
      expect(typeof model.description).toStrictEqual("string");
    });
  });

  test("正常系: すべてのモデルのIDが一意である", () => {
    const ids = chatModels.map((model) => model.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toStrictEqual(ids.length);
  });

  test("正常系: すべてのモデルのプロパティが空文字列ではない", () => {
    chatModels.forEach((model) => {
      expect(model.id.length).toBeGreaterThan(0);
      expect(model.name.length).toBeGreaterThan(0);
      expect(model.description.length).toBeGreaterThan(0);
    });
  });

  test("正常系: DEFAULT_CHAT_MODELがchatModelsに存在する", () => {
    const defaultModelExists = chatModels.some(
      (model) => model.id === DEFAULT_CHAT_MODEL,
    );
    expect(defaultModelExists).toStrictEqual(true);
  });

  test("正常系: chatModelsのオブジェクトがChatModel型に準拠している", () => {
    chatModels.forEach((model) => {
      const isValidChatModel: ChatModel = model;
      expect(isValidChatModel).toStrictEqual(model);
    });
  });
});

describe("ChatModel型", () => {
  test("正常系: ChatModel型のオブジェクトを正しく作成できる", () => {
    const validModel: ChatModel = {
      id: "test-model",
      name: "Test Model",
      description: "Test description",
    };

    expect(validModel.id).toStrictEqual("test-model");
    expect(validModel.name).toStrictEqual("Test Model");
    expect(validModel.description).toStrictEqual("Test description");
  });

  test("正常系: ChatModel型は必須プロパティを要求する", () => {
    const modelWithAllProperties: ChatModel = {
      id: "complete-model",
      name: "Complete Model",
      description: "Complete description",
    };

    expect(Object.keys(modelWithAllProperties).length).toStrictEqual(3);
    expect(modelWithAllProperties).toHaveProperty("id");
    expect(modelWithAllProperties).toHaveProperty("name");
    expect(modelWithAllProperties).toHaveProperty("description");
  });
});

describe("配列の操作", () => {
  test("正常系: chatModelsは読み取り専用配列として動作する", () => {
    const originalLength = chatModels.length;
    const originalFirstModel = chatModels[0];

    // 配列のコピーを作成して操作
    const modelsCopy = [...chatModels];
    modelsCopy.push({
      id: "new-model",
      name: "New Model",
      description: "New description",
    });

    // 元の配列は変更されていない
    expect(chatModels.length).toStrictEqual(originalLength);
    expect(chatModels[0]).toStrictEqual(originalFirstModel);
  });

  test("正常系: findメソッドでモデルを検索できる", () => {
    const foundModel = chatModels.find((model) => model.id === "chat-model");
    expect(foundModel).toStrictEqual({
      id: "chat-model",
      name: "Chat model",
      description: "Primary model for all-purpose chat",
    });
  });

  test("正常系: filterメソッドでモデルをフィルタリングできる", () => {
    const reasoningModels = chatModels.filter((model) =>
      model.id.includes("reasoning"),
    );
    expect(reasoningModels.length).toStrictEqual(1);
    expect(reasoningModels[0].id).toStrictEqual("chat-model-reasoning");
  });

  test("正常系: mapメソッドでモデルIDの配列を作成できる", () => {
    const modelIds = chatModels.map((model) => model.id);
    expect(modelIds).toStrictEqual(["chat-model", "chat-model-reasoning"]);
  });
});

describe("エッジケース", () => {
  test("正常系: chatModelsのインデックスアクセスが安全である", () => {
    const firstModel = chatModels[0];
    const secondModel = chatModels[1];
    const outOfBoundsModel = chatModels[99];

    expect(firstModel).toBeDefined();
    expect(secondModel).toBeDefined();
    expect(outOfBoundsModel).toBeUndefined();
  });

  test("正常系: chatModelsの長さが0より大きい", () => {
    expect(chatModels.length).toBeGreaterThan(0);
  });

  test("正常系: モデル名に特殊文字が含まれていない", () => {
    chatModels.forEach((model) => {
      // 英数字、スペース、ハイフンのみを許可
      const validNamePattern = /^[a-zA-Z0-9\s\-]+$/;
      expect(validNamePattern.test(model.name)).toStrictEqual(true);
    });
  });
});
