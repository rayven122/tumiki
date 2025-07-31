import { describe, test, expect, vi, beforeEach, type Mock } from "vitest";
import type { Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { MutableRefObject } from "react";

// モックの設定
vi.mock("prosemirror-inputrules");
vi.mock("prosemirror-model", () => ({
  Schema: vi.fn().mockImplementation(() => ({
    nodes: {
      heading: { name: "heading" },
      doc: {},
      text: {},
      paragraph: {},
    },
  })),
}));
vi.mock("prosemirror-schema-basic", () => ({
  schema: {
    spec: {
      nodes: { doc: {}, text: {}, paragraph: {} },
      marks: { strong: {}, em: {} },
    },
  },
}));
vi.mock("prosemirror-schema-list", () => ({
  addListNodes: vi.fn((nodes: Record<string, unknown>) => ({
    ...nodes,
    ordered_list: {},
    bullet_list: {},
    list_item: {},
  })),
}));
vi.mock("./functions");

// テスト対象とモックされたモジュールのインポート
import { documentSchema, headingRule, handleTransaction } from "./config";
import { textblockTypeInputRule } from "prosemirror-inputrules";
import { buildContentFromDocument } from "./functions";

// モックの型定義
const mockTextblockTypeInputRule = vi.mocked(textblockTypeInputRule);
const mockBuildContentFromDocument = vi.mocked(buildContentFromDocument);

// グローバルなセットアップ
beforeEach(() => {
  vi.clearAllMocks();
});

describe("documentSchema", () => {
  test("正常系: スキーマが定義されている", () => {
    expect(documentSchema).toBeDefined();
  });

  test("正常系: documentSchemaの構造を確認", () => {
    // documentSchemaは実際のSchemaインスタンスかモックされたものかを確認
    expect(documentSchema).toBeTruthy();
  });
});

describe("headingRule", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // textblockTypeInputRuleのモック設定
    mockTextblockTypeInputRule.mockImplementation(
      (regex, nodeType, getAttrs) =>
        ({
          type: "inputrule",
          regex,
          nodeType,
          getAttrs,
        }) as unknown as ReturnType<typeof textblockTypeInputRule>,
    );
  });

  test("正常系: レベル1の見出しルールが作成される", () => {
    const result = headingRule(1);

    expect(mockTextblockTypeInputRule).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty("type", "inputrule");

    // 正規表現のテスト
    const regex = mockTextblockTypeInputRule.mock.calls[0]![0];
    expect(regex.test("# ")).toStrictEqual(true);
    expect(regex.test("## ")).toStrictEqual(false);
  });

  test("正常系: レベル3の見出しルールが作成される", () => {
    const result = headingRule(3);

    expect(mockTextblockTypeInputRule).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty("type", "inputrule");

    // 正規表現のテスト
    const regex = mockTextblockTypeInputRule.mock.calls[0]![0];
    expect(regex.test("# ")).toStrictEqual(true);
    expect(regex.test("## ")).toStrictEqual(true);
    expect(regex.test("### ")).toStrictEqual(true);
    expect(regex.test("#### ")).toStrictEqual(false);
  });

  test("正常系: レベル6の見出しルールが作成される", () => {
    const result = headingRule(6);

    const regex = mockTextblockTypeInputRule.mock.calls[0]![0];
    expect(regex.test("###### ")).toStrictEqual(true);
    expect(regex.test("####### ")).toStrictEqual(false);
    expect(result).toHaveProperty("type", "inputrule");
  });

  test("正常系: アトリビュート関数が正しいレベルを返す", () => {
    headingRule(2);

    const attrFunc = mockTextblockTypeInputRule.mock.calls[0]![2];
    expect(
      typeof attrFunc === "function"
        ? attrFunc([] as unknown as RegExpMatchArray)
        : null,
    ).toStrictEqual({
      level: 2,
    });
  });

  test("正常系: レベル1の正規表現パターン", () => {
    headingRule(1);

    const regex = mockTextblockTypeInputRule.mock.calls[0]![0];
    expect(regex.source).toStrictEqual("^(#{1,1})\\s$");
  });

  test("境界値: 大きなレベル値でも正しく動作", () => {
    headingRule(10);

    const regex = mockTextblockTypeInputRule.mock.calls[0]![0];
    expect(regex.test("########## ")).toStrictEqual(true);
    expect(regex.test("########### ")).toStrictEqual(false);
  });

  test("境界値: レベル0の場合", () => {
    // レベル0では正規表現が無効になるためエラーが発生する
    expect(() => headingRule(0)).toThrow("Invalid regular expression");
  });

  test("正常系: 様々なレベルでの正規表現テスト", () => {
    const testCases = [
      { level: 1, valid: ["# "], invalid: ["## ", "### ", "####"] },
      { level: 2, valid: ["# ", "## "], invalid: ["### ", "####"] },
      {
        level: 4,
        valid: ["# ", "## ", "### ", "#### "],
        invalid: ["##### ", "###### "],
      },
    ];

    for (const { level, valid, invalid } of testCases) {
      vi.clearAllMocks();
      headingRule(level);
      const regex = mockTextblockTypeInputRule.mock.calls[0]![0];

      for (const v of valid) {
        expect(regex.test(v)).toStrictEqual(true);
      }
      for (const i of invalid) {
        expect(regex.test(i)).toStrictEqual(false);
      }
    }
  });
});

describe("handleTransaction", () => {
  let mockEditorView: EditorView;
  let mockTransaction: Transaction;
  let mockOnSaveContent: ReturnType<typeof vi.fn>;
  let editorRef: MutableRefObject<EditorView | null>;
  let mockStateApply: Mock;
  let mockUpdateState: Mock;
  let mockGetMeta: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStateApply = vi.fn().mockReturnValue("newState");
    mockUpdateState = vi.fn();
    mockGetMeta = vi.fn();

    const mockState = {
      apply: mockStateApply,
    } as unknown as EditorView["state"];

    mockEditorView = {
      state: mockState,
      updateState: mockUpdateState,
    } as unknown as EditorView;

    mockTransaction = {
      get docChanged() {
        return false;
      },
      getMeta: mockGetMeta,
    } as unknown as Transaction;

    mockOnSaveContent = vi.fn();
    editorRef = { current: mockEditorView };

    mockBuildContentFromDocument.mockReturnValue("mocked content");
  });

  test("正常系: editorRefがnullの場合は何もしない", () => {
    editorRef.current = null;

    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockOnSaveContent).not.toHaveBeenCalled();
    expect(mockStateApply).not.toHaveBeenCalled();
  });

  test("正常系: トランザクションが適用されて状態が更新される", () => {
    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockStateApply).toHaveBeenCalledWith(mockTransaction);
    expect(mockUpdateState).toHaveBeenCalledWith("newState");
  });

  test("正常系: docChangedがfalseの場合は保存されない", () => {
    // docChangedはgetterで設定済み

    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockOnSaveContent).not.toHaveBeenCalled();
  });

  test("正常系: docChangedがtrueでno-saveメタがtrueの場合は保存されない", () => {
    Object.defineProperty(mockTransaction, "docChanged", {
      value: true,
      configurable: true,
    });
    mockGetMeta.mockImplementation((key: string) => {
      return key === "no-save" ? true : undefined;
    });

    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockOnSaveContent).not.toHaveBeenCalled();
  });

  test("正常系: docChangedがtrueでno-debounceメタがtrueの場合はデバウンスなしで保存される", () => {
    const newState = {
      doc: { type: "doc" },
    };
    mockStateApply.mockReturnValue(
      newState as unknown as ReturnType<EditorView["state"]["apply"]>,
    );

    Object.defineProperty(mockTransaction, "docChanged", {
      value: true,
      configurable: true,
    });
    mockGetMeta.mockImplementation((key: string) => {
      return key === "no-debounce" ? true : undefined;
    });

    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockBuildContentFromDocument).toHaveBeenCalledWith(newState.doc);
    expect(mockOnSaveContent).toHaveBeenCalledWith("mocked content", false);
  });

  test("正常系: docChangedがtrueでメタデータがない場合はデバウンスありで保存される", () => {
    const newState = {
      doc: { type: "doc" },
    };
    mockStateApply.mockReturnValue(
      newState as unknown as ReturnType<EditorView["state"]["apply"]>,
    );

    Object.defineProperty(mockTransaction, "docChanged", {
      value: true,
      configurable: true,
    });
    mockGetMeta.mockReturnValue(undefined);

    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockBuildContentFromDocument).toHaveBeenCalledWith(newState.doc);
    expect(mockOnSaveContent).toHaveBeenCalledWith("mocked content", true);
  });

  test("正常系: no-saveがfalseでno-debounceもfalseの場合はデバウンスありで保存される", () => {
    const newState = {
      doc: { type: "doc" },
    };
    mockStateApply.mockReturnValue(
      newState as unknown as ReturnType<EditorView["state"]["apply"]>,
    );

    Object.defineProperty(mockTransaction, "docChanged", {
      value: true,
      configurable: true,
    });
    mockGetMeta.mockImplementation((_key: string) => {
      return false;
    });

    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockBuildContentFromDocument).toHaveBeenCalledWith(newState.doc);
    expect(mockOnSaveContent).toHaveBeenCalledWith("mocked content", true);
  });

  test("境界値: editorRefがundefinedの場合は何もしない", () => {
    handleTransaction({
      transaction: mockTransaction,
      editorRef: undefined as unknown as MutableRefObject<EditorView | null>,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockOnSaveContent).not.toHaveBeenCalled();
  });

  test("境界値: editorRef.currentがundefinedの場合は何もしない", () => {
    editorRef.current = undefined as unknown as EditorView | null;

    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockOnSaveContent).not.toHaveBeenCalled();
  });

  test("異常系: buildContentFromDocumentがエラーをスローした場合", () => {
    const newState = {
      doc: { type: "doc" },
    };
    mockStateApply.mockReturnValue(
      newState as unknown as ReturnType<EditorView["state"]["apply"]>,
    );
    mockBuildContentFromDocument.mockImplementation(() => {
      throw new Error("Build error");
    });

    Object.defineProperty(mockTransaction, "docChanged", {
      value: true,
      configurable: true,
    });
    mockGetMeta.mockReturnValue(undefined);

    expect(() => {
      handleTransaction({
        transaction: mockTransaction,
        editorRef,
        onSaveContent: mockOnSaveContent,
      });
    }).toThrow("Build error");

    expect(mockUpdateState).toHaveBeenCalledWith(newState);
    expect(mockOnSaveContent).not.toHaveBeenCalled();
  });

  test("正常系: no-saveがundefinedでno-debounceがundefinedの場合はデバウンスありで保存される", () => {
    const newState = {
      doc: { type: "doc" },
    };
    mockStateApply.mockReturnValue(
      newState as unknown as ReturnType<EditorView["state"]["apply"]>,
    );

    Object.defineProperty(mockTransaction, "docChanged", {
      value: true,
      configurable: true,
    });
    mockGetMeta.mockReturnValue(undefined);

    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockBuildContentFromDocument).toHaveBeenCalledWith(newState.doc);
    expect(mockOnSaveContent).toHaveBeenCalledWith("mocked content", true);
  });

  test("正常系: 複数のメタデータが設定されている場合", () => {
    const newState = {
      doc: { type: "doc" },
    };
    mockStateApply.mockReturnValue(
      newState as unknown as ReturnType<EditorView["state"]["apply"]>,
    );

    Object.defineProperty(mockTransaction, "docChanged", {
      value: true,
      configurable: true,
    });
    mockGetMeta.mockImplementation((key: string) => {
      if (key === "no-save") return false;
      if (key === "no-debounce") return false;
      if (key === "other") return "value";
      return undefined;
    });

    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockGetMeta).toHaveBeenCalledWith("no-save");
    expect(mockGetMeta).toHaveBeenCalledWith("no-debounce");
    expect(mockOnSaveContent).toHaveBeenCalledWith("mocked content", true);
  });

  test("正常系: 空のdocでも処理される", () => {
    const newState = {
      doc: {},
    };
    mockStateApply.mockReturnValue(
      newState as unknown as ReturnType<EditorView["state"]["apply"]>,
    );

    Object.defineProperty(mockTransaction, "docChanged", {
      value: true,
      configurable: true,
    });
    mockGetMeta.mockReturnValue(undefined);

    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockBuildContentFromDocument).toHaveBeenCalledWith(newState.doc);
    expect(mockOnSaveContent).toHaveBeenCalledWith("mocked content", true);
  });

  test("正常系: getMetaが常にfalseを返す場合", () => {
    const newState = {
      doc: { type: "doc" },
    };
    mockStateApply.mockReturnValue(
      newState as unknown as ReturnType<EditorView["state"]["apply"]>,
    );

    Object.defineProperty(mockTransaction, "docChanged", {
      value: true,
      configurable: true,
    });
    mockGetMeta.mockReturnValue(false);

    handleTransaction({
      transaction: mockTransaction,
      editorRef,
      onSaveContent: mockOnSaveContent,
    });

    expect(mockBuildContentFromDocument).toHaveBeenCalledWith(newState.doc);
    expect(mockOnSaveContent).toHaveBeenCalledWith("mocked content", true);
  });
});
