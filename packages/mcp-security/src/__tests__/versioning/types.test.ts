import { describe, expect, test } from "vitest";

import {
  ModifiedToolSchema,
  ToolChangesSchema,
  ToolSnapshotSchema,
} from "../../versioning/types.js";

describe("ToolSnapshotSchema", () => {
  test("有効なツールスナップショットを受け入れる", () => {
    const snapshot = {
      name: "test_tool",
      description: "テストツール",
      inputSchema: { type: "object" },
    };

    const result = ToolSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(true);
  });

  test("inputSchemaが空オブジェクトでも受け入れる", () => {
    const snapshot = {
      name: "test_tool",
      description: "テストツール",
      inputSchema: {},
    };

    const result = ToolSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(true);
  });

  test("名前が欠けている場合は拒否する", () => {
    const snapshot = {
      description: "テストツール",
      inputSchema: {},
    };

    const result = ToolSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });

  test("descriptionが欠けている場合は拒否する", () => {
    const snapshot = {
      name: "test_tool",
      inputSchema: {},
    };

    const result = ToolSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });

  test("inputSchemaが欠けている場合は拒否する", () => {
    const snapshot = {
      name: "test_tool",
      description: "テストツール",
    };

    const result = ToolSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(false);
  });
});

describe("ModifiedToolSchema", () => {
  test("descriptionの変更を受け入れる", () => {
    const modified = {
      name: "test_tool",
      field: "description",
      before: "旧説明",
      after: "新説明",
    };

    const result = ModifiedToolSchema.safeParse(modified);
    expect(result.success).toBe(true);
  });

  test("inputSchemaの変更を受け入れる", () => {
    const modified = {
      name: "test_tool",
      field: "inputSchema",
      before: "{}",
      after: '{"type":"object"}',
    };

    const result = ModifiedToolSchema.safeParse(modified);
    expect(result.success).toBe(true);
  });

  test("無効なフィールドタイプは拒否する", () => {
    const modified = {
      name: "test_tool",
      field: "name",
      before: "old_name",
      after: "new_name",
    };

    const result = ModifiedToolSchema.safeParse(modified);
    expect(result.success).toBe(false);
  });
});

describe("ToolChangesSchema", () => {
  test("変更なしの状態を受け入れる", () => {
    const changes = {
      hasChanges: false,
      added: [],
      removed: [],
      modified: [],
    };

    const result = ToolChangesSchema.safeParse(changes);
    expect(result.success).toBe(true);
  });

  test("追加のみの変更を受け入れる", () => {
    const changes = {
      hasChanges: true,
      added: [{ name: "new_tool", description: "新規ツール" }],
      removed: [],
      modified: [],
    };

    const result = ToolChangesSchema.safeParse(changes);
    expect(result.success).toBe(true);
  });

  test("削除のみの変更を受け入れる", () => {
    const changes = {
      hasChanges: true,
      added: [],
      removed: [{ name: "old_tool", description: "古いツール" }],
      modified: [],
    };

    const result = ToolChangesSchema.safeParse(changes);
    expect(result.success).toBe(true);
  });

  test("修正のみの変更を受け入れる", () => {
    const changes = {
      hasChanges: true,
      added: [],
      removed: [],
      modified: [
        {
          name: "test_tool",
          field: "description",
          before: "旧",
          after: "新",
        },
      ],
    };

    const result = ToolChangesSchema.safeParse(changes);
    expect(result.success).toBe(true);
  });

  test("複合的な変更を受け入れる", () => {
    const changes = {
      hasChanges: true,
      added: [{ name: "new_tool", description: "新規" }],
      removed: [{ name: "old_tool", description: "削除" }],
      modified: [
        {
          name: "changed_tool",
          field: "inputSchema",
          before: "{}",
          after: '{"type":"object"}',
        },
      ],
    };

    const result = ToolChangesSchema.safeParse(changes);
    expect(result.success).toBe(true);
  });

  test("hasChangesが欠けている場合は拒否する", () => {
    const changes = {
      added: [],
      removed: [],
      modified: [],
    };

    const result = ToolChangesSchema.safeParse(changes);
    expect(result.success).toBe(false);
  });
});
