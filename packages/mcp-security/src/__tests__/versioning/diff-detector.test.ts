import { describe, expect, test } from "vitest";

import type { ToolChanges, ToolSnapshot } from "../../versioning/types.js";
import {
  applyChangesToTools,
  detectToolChanges,
  reconstructToolsFromChanges,
} from "../../versioning/diff-detector.js";

describe("detectToolChanges", () => {
  test("変更がない場合は hasChanges が false になる", () => {
    const previousTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: { type: "object" } },
      { name: "tool2", description: "説明2", inputSchema: { type: "string" } },
    ];
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: { type: "object" } },
      { name: "tool2", description: "説明2", inputSchema: { type: "string" } },
    ];

    const result = detectToolChanges(previousTools, currentTools);

    expect(result.hasChanges).toBe(false);
    expect(result.added).toStrictEqual([]);
    expect(result.removed).toStrictEqual([]);
    expect(result.modified).toStrictEqual([]);
  });

  test("空の配列同士の比較では変更なしになる", () => {
    const result = detectToolChanges([], []);

    expect(result.hasChanges).toBe(false);
    expect(result.added).toStrictEqual([]);
    expect(result.removed).toStrictEqual([]);
    expect(result.modified).toStrictEqual([]);
  });

  test("ツールが追加された場合を検出する", () => {
    const previousTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
    ];
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
      { name: "tool2", description: "新しいツール", inputSchema: {} },
    ];

    const result = detectToolChanges(previousTools, currentTools);

    expect(result.hasChanges).toBe(true);
    expect(result.added).toStrictEqual([
      { name: "tool2", description: "新しいツール" },
    ]);
    expect(result.removed).toStrictEqual([]);
    expect(result.modified).toStrictEqual([]);
  });

  test("複数のツールが追加された場合を検出する", () => {
    const previousTools: ToolSnapshot[] = [];
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "ツール1", inputSchema: {} },
      { name: "tool2", description: "ツール2", inputSchema: {} },
    ];

    const result = detectToolChanges(previousTools, currentTools);

    expect(result.hasChanges).toBe(true);
    expect(result.added).toHaveLength(2);
    expect(result.added).toContainEqual({
      name: "tool1",
      description: "ツール1",
    });
    expect(result.added).toContainEqual({
      name: "tool2",
      description: "ツール2",
    });
  });

  test("ツールが削除された場合を検出する", () => {
    const previousTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
      { name: "tool2", description: "削除されるツール", inputSchema: {} },
    ];
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
    ];

    const result = detectToolChanges(previousTools, currentTools);

    expect(result.hasChanges).toBe(true);
    expect(result.added).toStrictEqual([]);
    expect(result.removed).toStrictEqual([
      { name: "tool2", description: "削除されるツール" },
    ]);
    expect(result.modified).toStrictEqual([]);
  });

  test("複数のツールが削除された場合を検出する", () => {
    const previousTools: ToolSnapshot[] = [
      { name: "tool1", description: "ツール1", inputSchema: {} },
      { name: "tool2", description: "ツール2", inputSchema: {} },
    ];
    const currentTools: ToolSnapshot[] = [];

    const result = detectToolChanges(previousTools, currentTools);

    expect(result.hasChanges).toBe(true);
    expect(result.removed).toHaveLength(2);
    expect(result.removed).toContainEqual({
      name: "tool1",
      description: "ツール1",
    });
    expect(result.removed).toContainEqual({
      name: "tool2",
      description: "ツール2",
    });
  });

  test("description が変更された場合を検出する", () => {
    const previousTools: ToolSnapshot[] = [
      { name: "tool1", description: "旧説明", inputSchema: {} },
    ];
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "新説明", inputSchema: {} },
    ];

    const result = detectToolChanges(previousTools, currentTools);

    expect(result.hasChanges).toBe(true);
    expect(result.added).toStrictEqual([]);
    expect(result.removed).toStrictEqual([]);
    expect(result.modified).toStrictEqual([
      {
        name: "tool1",
        field: "description",
        before: "旧説明",
        after: "新説明",
      },
    ]);
  });

  test("inputSchema が変更された場合を検出する", () => {
    const previousTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明", inputSchema: { type: "object" } },
    ];
    const currentTools: ToolSnapshot[] = [
      {
        name: "tool1",
        description: "説明",
        inputSchema: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      },
    ];

    const result = detectToolChanges(previousTools, currentTools);

    expect(result.hasChanges).toBe(true);
    expect(result.modified).toHaveLength(1);
    expect(result.modified[0]).toStrictEqual({
      name: "tool1",
      field: "inputSchema",
      before: JSON.stringify({ type: "object" }),
      after: JSON.stringify({
        type: "object",
        properties: { name: { type: "string" } },
      }),
    });
  });

  test("description と inputSchema の両方が変更された場合を検出する", () => {
    const previousTools: ToolSnapshot[] = [
      { name: "tool1", description: "旧説明", inputSchema: { type: "object" } },
    ];
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "新説明", inputSchema: { type: "string" } },
    ];

    const result = detectToolChanges(previousTools, currentTools);

    expect(result.hasChanges).toBe(true);
    expect(result.modified).toHaveLength(2);
    expect(result.modified).toContainEqual({
      name: "tool1",
      field: "description",
      before: "旧説明",
      after: "新説明",
    });
    expect(result.modified).toContainEqual({
      name: "tool1",
      field: "inputSchema",
      before: JSON.stringify({ type: "object" }),
      after: JSON.stringify({ type: "string" }),
    });
  });

  test("追加・削除・変更が同時に発生した場合を検出する", () => {
    const previousTools: ToolSnapshot[] = [
      { name: "tool1", description: "変更前", inputSchema: {} },
      { name: "tool2", description: "削除される", inputSchema: {} },
    ];
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "変更後", inputSchema: {} },
      { name: "tool3", description: "新規追加", inputSchema: {} },
    ];

    const result = detectToolChanges(previousTools, currentTools);

    expect(result.hasChanges).toBe(true);
    expect(result.added).toStrictEqual([
      { name: "tool3", description: "新規追加" },
    ]);
    expect(result.removed).toStrictEqual([
      { name: "tool2", description: "削除される" },
    ]);
    expect(result.modified).toStrictEqual([
      {
        name: "tool1",
        field: "description",
        before: "変更前",
        after: "変更後",
      },
    ]);
  });

  test("ツールの順序が異なっていても正しく比較する", () => {
    const previousTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
      { name: "tool2", description: "説明2", inputSchema: {} },
    ];
    const currentTools: ToolSnapshot[] = [
      { name: "tool2", description: "説明2", inputSchema: {} },
      { name: "tool1", description: "説明1", inputSchema: {} },
    ];

    const result = detectToolChanges(previousTools, currentTools);

    expect(result.hasChanges).toBe(false);
  });
});

describe("applyChangesToTools", () => {
  test("変更がない場合はベースラインをそのまま返す", () => {
    const baseline: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: { type: "object" } },
    ];
    const changes: ToolChanges = {
      hasChanges: false,
      added: [],
      removed: [],
      modified: [],
    };

    const result = applyChangesToTools(baseline, changes);

    expect(result).toStrictEqual(baseline);
  });

  test("ツールの追加を適用する", () => {
    const baseline: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
    ];
    const changes: ToolChanges = {
      hasChanges: true,
      added: [{ name: "tool2", description: "新規ツール" }],
      removed: [],
      modified: [],
    };

    const result = applyChangesToTools(baseline, changes);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      name: "tool1",
      description: "説明1",
      inputSchema: {},
    });
    expect(result).toContainEqual({
      name: "tool2",
      description: "新規ツール",
      inputSchema: {},
    });
  });

  test("ツールの削除を適用する", () => {
    const baseline: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
      { name: "tool2", description: "削除対象", inputSchema: {} },
    ];
    const changes: ToolChanges = {
      hasChanges: true,
      added: [],
      removed: [{ name: "tool2", description: "削除対象" }],
      modified: [],
    };

    const result = applyChangesToTools(baseline, changes);

    expect(result).toHaveLength(1);
    expect(result).toStrictEqual([
      { name: "tool1", description: "説明1", inputSchema: {} },
    ]);
  });

  test("description の変更を適用する", () => {
    const baseline: ToolSnapshot[] = [
      { name: "tool1", description: "旧説明", inputSchema: {} },
    ];
    const changes: ToolChanges = {
      hasChanges: true,
      added: [],
      removed: [],
      modified: [
        {
          name: "tool1",
          field: "description",
          before: "旧説明",
          after: "新説明",
        },
      ],
    };

    const result = applyChangesToTools(baseline, changes);

    expect(result).toStrictEqual([
      { name: "tool1", description: "新説明", inputSchema: {} },
    ]);
  });

  test("inputSchema の変更を適用する", () => {
    const baseline: ToolSnapshot[] = [
      { name: "tool1", description: "説明", inputSchema: { type: "object" } },
    ];
    const changes: ToolChanges = {
      hasChanges: true,
      added: [],
      removed: [],
      modified: [
        {
          name: "tool1",
          field: "inputSchema",
          before: JSON.stringify({ type: "object" }),
          after: JSON.stringify({ type: "string" }),
        },
      ],
    };

    const result = applyChangesToTools(baseline, changes);

    expect(result).toStrictEqual([
      { name: "tool1", description: "説明", inputSchema: { type: "string" } },
    ]);
  });

  test("追加・削除・変更を同時に適用する", () => {
    const baseline: ToolSnapshot[] = [
      { name: "tool1", description: "変更前", inputSchema: {} },
      { name: "tool2", description: "削除される", inputSchema: {} },
    ];
    const changes: ToolChanges = {
      hasChanges: true,
      added: [{ name: "tool3", description: "新規" }],
      removed: [{ name: "tool2", description: "削除される" }],
      modified: [
        {
          name: "tool1",
          field: "description",
          before: "変更前",
          after: "変更後",
        },
      ],
    };

    const result = applyChangesToTools(baseline, changes);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      name: "tool1",
      description: "変更後",
      inputSchema: {},
    });
    expect(result).toContainEqual({
      name: "tool3",
      description: "新規",
      inputSchema: {},
    });
  });

  test("存在しないツールへの変更は無視される", () => {
    const baseline: ToolSnapshot[] = [
      { name: "tool1", description: "説明", inputSchema: {} },
    ];
    const changes: ToolChanges = {
      hasChanges: true,
      added: [],
      removed: [],
      modified: [
        {
          name: "nonexistent",
          field: "description",
          before: "旧",
          after: "新",
        },
      ],
    };

    const result = applyChangesToTools(baseline, changes);

    expect(result).toStrictEqual(baseline);
  });

  test("元のベースラインを変更しない（イミュータブル）", () => {
    const baseline: ToolSnapshot[] = [
      { name: "tool1", description: "元の説明", inputSchema: {} },
    ];
    const changes: ToolChanges = {
      hasChanges: true,
      added: [],
      removed: [],
      modified: [
        {
          name: "tool1",
          field: "description",
          before: "元の説明",
          after: "新しい説明",
        },
      ],
    };

    applyChangesToTools(baseline, changes);

    expect(baseline[0]?.description).toBe("元の説明");
  });
});

describe("reconstructToolsFromChanges", () => {
  test("変更リストが空の場合はベースラインをそのまま返す", () => {
    const baseline: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
    ];

    const result = reconstructToolsFromChanges(baseline, []);

    expect(result).toStrictEqual(baseline);
  });

  test("単一の変更を適用する", () => {
    const baseline: ToolSnapshot[] = [
      { name: "tool1", description: "v1説明", inputSchema: {} },
    ];
    const changesList: ToolChanges[] = [
      {
        hasChanges: true,
        added: [],
        removed: [],
        modified: [
          {
            name: "tool1",
            field: "description",
            before: "v1説明",
            after: "v2説明",
          },
        ],
      },
    ];

    const result = reconstructToolsFromChanges(baseline, changesList);

    expect(result).toStrictEqual([
      { name: "tool1", description: "v2説明", inputSchema: {} },
    ]);
  });

  test("複数の変更を順番に適用する", () => {
    const baseline: ToolSnapshot[] = [
      { name: "tool1", description: "v1", inputSchema: {} },
    ];
    const changesList: ToolChanges[] = [
      {
        hasChanges: true,
        added: [{ name: "tool2", description: "v2で追加" }],
        removed: [],
        modified: [
          { name: "tool1", field: "description", before: "v1", after: "v2" },
        ],
      },
      {
        hasChanges: true,
        added: [{ name: "tool3", description: "v3で追加" }],
        removed: [],
        modified: [
          { name: "tool1", field: "description", before: "v2", after: "v3" },
          {
            name: "tool2",
            field: "description",
            before: "v2で追加",
            after: "v3で更新",
          },
        ],
      },
    ];

    const result = reconstructToolsFromChanges(baseline, changesList);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({
      name: "tool1",
      description: "v3",
      inputSchema: {},
    });
    expect(result).toContainEqual({
      name: "tool2",
      description: "v3で更新",
      inputSchema: {},
    });
    expect(result).toContainEqual({
      name: "tool3",
      description: "v3で追加",
      inputSchema: {},
    });
  });

  test("追加後に削除される場合を正しく処理する", () => {
    const baseline: ToolSnapshot[] = [];
    const changesList: ToolChanges[] = [
      {
        hasChanges: true,
        added: [{ name: "tool1", description: "追加" }],
        removed: [],
        modified: [],
      },
      {
        hasChanges: true,
        added: [],
        removed: [{ name: "tool1", description: "追加" }],
        modified: [],
      },
    ];

    const result = reconstructToolsFromChanges(baseline, changesList);

    expect(result).toStrictEqual([]);
  });

  test("複雑なシナリオ: 追加・削除・変更が複数バージョンにわたる", () => {
    const baseline: ToolSnapshot[] = [
      { name: "original", description: "オリジナル", inputSchema: {} },
    ];
    const changesList: ToolChanges[] = [
      // v2: original を更新、tool_a を追加
      {
        hasChanges: true,
        added: [{ name: "tool_a", description: "ツールA" }],
        removed: [],
        modified: [
          {
            name: "original",
            field: "description",
            before: "オリジナル",
            after: "更新1",
          },
        ],
      },
      // v3: tool_a を削除、tool_b を追加、original を更新
      {
        hasChanges: true,
        added: [{ name: "tool_b", description: "ツールB" }],
        removed: [{ name: "tool_a", description: "ツールA" }],
        modified: [
          {
            name: "original",
            field: "description",
            before: "更新1",
            after: "更新2",
          },
        ],
      },
      // v4: tool_b の inputSchema を変更
      {
        hasChanges: true,
        added: [],
        removed: [],
        modified: [
          {
            name: "tool_b",
            field: "inputSchema",
            before: "{}",
            after: JSON.stringify({ type: "object" }),
          },
        ],
      },
    ];

    const result = reconstructToolsFromChanges(baseline, changesList);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      name: "original",
      description: "更新2",
      inputSchema: {},
    });
    expect(result).toContainEqual({
      name: "tool_b",
      description: "ツールB",
      inputSchema: { type: "object" },
    });
  });
});
