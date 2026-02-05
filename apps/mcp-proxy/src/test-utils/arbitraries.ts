/**
 * Property-Based Testing 用カスタム Arbitrary 定義
 *
 * fast-check を使用した PBT 用の型安全なテストデータ生成器
 */

import * as fc from "fast-check";

// ============================================================
// ツール名関連の Arbitrary
// ============================================================

/**
 * 有効なツールインスタンス名（"_" を末尾に含まず、"__" を含まない英数字）
 * 実装が `split("__")` でパースするため、名前の末尾が "_" だと
 * `A___B` が `["A_", "_B"]` にパースされる問題を回避
 */
export const validInstanceNameArbitrary = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9-]*$/)
  .filter((s) => s.length > 0 && s.length <= 50 && !s.includes("__"));

/**
 * 有効なツール名（インスタンス名と同様の制約）
 */
export const validToolNameArbitrary = fc
  .stringMatching(/^[a-zA-Z][a-zA-Z0-9-]*$/)
  .filter((s) => s.length > 0 && s.length <= 50 && !s.includes("__"));

/**
 * 有効なフルツール名（"{インスタンス名}__{ツール名}" 形式）
 */
export const validFullToolNameArbitrary = fc
  .tuple(validInstanceNameArbitrary, validToolNameArbitrary)
  .map(([instance, tool]) => `${instance}__${tool}`);

/**
 * 無効なツール名のパターン（"__" を含まない、または複数の "__" を含む）
 */
export const invalidToolNameArbitrary = fc.oneof(
  // "__" を含まないパターン
  fc.string({ minLength: 1 }).filter((s) => !s.includes("__")),
  // 複数の "__" を含むパターン
  fc
    .tuple(
      validInstanceNameArbitrary,
      validToolNameArbitrary,
      validToolNameArbitrary,
    )
    .map(([a, b, c]) => `${a}__${b}__${c}`),
  // 空の部分を持つパターン
  fc.constantFrom("__tool", "instance__", "__"),
);

// ============================================================
// JSON-RPC 2.0 関連の Arbitrary
// ============================================================

/**
 * JSON-RPC 2.0 ID（string | number | null）
 */
export const jsonRpcIdArbitrary = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.constant(null),
);

/**
 * JSON-RPC 2.0 リクエスト
 */
export const jsonRpcRequestArbitrary = fc.record({
  jsonrpc: fc.constant("2.0" as const),
  method: fc.string({ minLength: 1 }),
  params: fc.option(fc.jsonValue(), { nil: undefined }),
  id: fc.option(jsonRpcIdArbitrary, { nil: undefined }),
});

/**
 * JSON-RPC 2.0 成功レスポンス
 */
type JsonRpcSuccessResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
};
export const jsonRpcSuccessResponseArbitrary: fc.Arbitrary<JsonRpcSuccessResponse> =
  fc.record({
    jsonrpc: fc.constant("2.0" as const),
    id: jsonRpcIdArbitrary,
    result: fc.jsonValue(),
  });

/**
 * JSON-RPC 2.0 エラーレスポンス
 */
export const jsonRpcErrorResponseArbitrary = fc.record({
  jsonrpc: fc.constant("2.0" as const),
  id: jsonRpcIdArbitrary,
  error: fc.record({
    code: fc.integer(),
    message: fc.string(),
    data: fc.option(fc.jsonValue(), { nil: undefined }),
  }),
});

/**
 * 非JSON-RPC 2.0 オブジェクト（無効なデータ）
 */
export const nonJsonRpcObjectArbitrary = fc.oneof(
  // jsonrpc がないオブジェクト
  fc.record({ method: fc.string() }),
  // jsonrpc が "2.0" 以外
  fc.record({
    jsonrpc: fc.string().filter((s) => s !== "2.0"),
    method: fc.string(),
  }),
  // プリミティブ値
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  // 配列
  fc.array(fc.jsonValue()),
);

// ============================================================
// MCP コンテンツ関連の Arbitrary
// ============================================================

// MCP コンテンツアイテムの型定義
type McpTextContent = {
  type: "text";
  text: string;
};

type McpImageContent = {
  type: "image";
  data: string;
  mimeType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
};

type McpResourceContent = {
  type: "resource";
  resource: unknown;
};

type McpContentItem = McpTextContent | McpImageContent | McpResourceContent;

type McpToolCallResult = {
  content: McpContentItem[];
  isError?: boolean;
};

/**
 * MCP テキストコンテンツアイテム
 */
export const mcpTextContentArbitrary: fc.Arbitrary<McpTextContent> = fc.record({
  type: fc.constant("text" as const),
  text: fc.string(),
});

/**
 * MCP 画像コンテンツアイテム
 */
export const mcpImageContentArbitrary: fc.Arbitrary<McpImageContent> =
  fc.record({
    type: fc.constant("image" as const),
    data: fc.base64String(),
    mimeType: fc.constantFrom(
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
    ),
  });

/**
 * MCP リソースコンテンツアイテム
 */
export const mcpResourceContentArbitrary: fc.Arbitrary<McpResourceContent> =
  fc.record({
    type: fc.constant("resource" as const),
    resource: fc.jsonValue(),
  });

/**
 * MCP コンテンツアイテム（任意のタイプ）
 */
export const mcpContentItemArbitrary: fc.Arbitrary<McpContentItem> = fc.oneof(
  mcpTextContentArbitrary,
  mcpImageContentArbitrary,
  mcpResourceContentArbitrary,
);

/**
 * MCP tools/call レスポンス結果
 */
export const mcpToolCallResultArbitrary: fc.Arbitrary<McpToolCallResult> =
  fc.record({
    content: fc.array(mcpContentItemArbitrary, { minLength: 1 }),
    isError: fc.option(fc.boolean(), { nil: undefined }),
  });

// ============================================================
// 暗号化関連の Arbitrary
// ============================================================

/**
 * 暗号化対象の平文（空文字を含む任意の文字列）
 */
export const plaintextArbitrary = fc.string();

/**
 * Unicode を含む平文（絵文字、CJK文字等）
 */
export const unicodePlaintextArbitrary = fc.oneof(
  fc.string(),
  fc.string({ unit: "grapheme" }),
  fc.string({ unit: "grapheme-composite" }),
);

/**
 * 有効な暗号化キー（64文字の16進数）
 */
export const validEncryptionKeyArbitrary = fc
  .array(fc.integer({ min: 0, max: 255 }), { minLength: 32, maxLength: 32 })
  .map((bytes) => Buffer.from(bytes).toString("hex"))
  .filter((key) => !key.split("").every((c) => c === "0"));

/**
 * 無効な暗号化キー
 */
export const invalidEncryptionKeyArbitrary = fc.oneof(
  // 長さが不正（短い）
  fc.stringMatching(/^[0-9a-fA-F]{1,63}$/),
  // 長さが不正（長い）
  fc.stringMatching(/^[0-9a-fA-F]{65,100}$/),
  // 16進数以外の文字を含む
  fc.string().filter((s) => !/^[0-9a-fA-F]*$/.test(s) && s.length === 64),
  // 全て0
  fc.constant("0".repeat(64)),
);

// ============================================================
// Dynamic Search 関連の Arbitrary (EE)
// ============================================================

/**
 * search_tools 引数
 */
export const searchToolsArgsArbitrary = fc.record({
  query: fc.string({ minLength: 1 }),
  limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
});

/**
 * describe_tools 引数
 */
export const describeToolsArgsArbitrary = fc.record({
  toolNames: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
});

/**
 * CallToolRequestParams 引数
 * noNullPrototype を使用して null プロトタイプオブジェクトを回避
 * "__proto__" キーを除外してプロトタイプ汚染を防止
 */
export const callToolRequestParamsArbitrary = fc.record({
  name: fc.string({ minLength: 1 }),
  arguments: fc.option(
    fc
      .array(
        fc.tuple(
          fc
            .string()
            .filter((key) => key !== "__proto__" && key !== "constructor"),
          fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
        ),
      )
      .map((entries) => Object.fromEntries(entries)),
    { nil: undefined },
  ),
});

// ============================================================
// 汎用ユーティリティ Arbitrary
// ============================================================

/**
 * 任意の値（null, undefined, primitive, object, array）
 * toString/valueOf をオーバーライドするオブジェクトは除外
 * （String() 変換時にエラーを起こすため）
 */
export const anyValueArbitrary: fc.Arbitrary<unknown> = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.string(),
  fc.integer(),
  fc.double(),
  fc.boolean(),
  fc.array(
    fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
  ),
  fc
    .array(
      fc.tuple(
        fc.string(),
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
      ),
    )
    .filter(
      (entries) =>
        !entries.some(
          ([key]) =>
            key === "toString" || key === "valueOf" || key === "__proto__",
        ),
    )
    .map((entries) => Object.fromEntries(entries)),
);

/**
 * Error オブジェクト
 */
export const errorArbitrary = fc.string().map((message) => new Error(message));

/**
 * Error 以外の値（toError テスト用）
 */
export const nonErrorArbitrary = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.double(),
  fc.boolean(),
  fc.constant(null),
  fc.constant(undefined),
  fc.jsonValue(),
);
