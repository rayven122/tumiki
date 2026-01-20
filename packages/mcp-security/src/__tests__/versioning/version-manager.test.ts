import { describe, expect, test } from "vitest";

import type { ToolChanges, ToolSnapshot } from "../../versioning/types.js";
import {
  createInitialChanges,
  createVersionIfChanged,
  getPendingChanges,
  getToolsAtVersion,
  mergeChanges,
} from "../../versioning/version-manager.js";

describe("createVersionIfChanged", () => {
  test("変更がない場合は hasChanges: false を返す", () => {
    const previousChanges: ToolChanges[] = [
      {
        hasChanges: true,
        added: [{ name: "tool1", description: "説明1" }],
        removed: [],
        modified: [],
      },
    ];
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
    ];

    const result = createVersionIfChanged({
      previousChanges,
      currentTools,
      scanType: "SCHEDULED",
      vulnerabilities: [],
      executionTimeMs: 100,
    });

    expect(result.hasChanges).toBe(false);
  });

  test("初回スキャン時（previousChanges が空）で変更を検出する", () => {
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
      { name: "tool2", description: "説明2", inputSchema: {} },
    ];

    const result = createVersionIfChanged({
      previousChanges: [],
      currentTools,
      scanType: "INITIAL",
      vulnerabilities: [],
      executionTimeMs: 150,
    });

    expect(result.hasChanges).toBe(true);
    if (result.hasChanges) {
      expect(result.version).toBe(1);
      expect(result.scanType).toBe("INITIAL");
      expect(result.isClean).toBe(true);
      expect(result.changes.added).toHaveLength(2);
    }
  });

  test("ツールが追加された場合に新バージョンを作成する", () => {
    const previousChanges: ToolChanges[] = [
      {
        hasChanges: true,
        added: [{ name: "tool1", description: "説明1" }],
        removed: [],
        modified: [],
      },
    ];
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
      { name: "tool2", description: "新規ツール", inputSchema: {} },
    ];

    const result = createVersionIfChanged({
      previousChanges,
      currentTools,
      scanType: "SCHEDULED",
      vulnerabilities: [],
      executionTimeMs: 200,
    });

    expect(result.hasChanges).toBe(true);
    if (result.hasChanges) {
      expect(result.version).toBe(2);
      expect(result.changes.added).toStrictEqual([
        { name: "tool2", description: "新規ツール" },
      ]);
      expect(result.isClean).toBe(true);
    }
  });

  test("脆弱性がある場合は isClean が false になる", () => {
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
    ];

    const result = createVersionIfChanged({
      previousChanges: [],
      currentTools,
      scanType: "INITIAL",
      vulnerabilities: [{ type: "tool_poisoning", toolName: "tool1" }],
      executionTimeMs: 100,
    });

    expect(result.hasChanges).toBe(true);
    if (result.hasChanges) {
      expect(result.isClean).toBe(false);
      expect(result.vulnerabilities).toHaveLength(1);
    }
  });

  test("executionTimeMs が正しく設定される", () => {
    const currentTools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
    ];

    const result = createVersionIfChanged({
      previousChanges: [],
      currentTools,
      scanType: "MANUAL",
      vulnerabilities: [],
      executionTimeMs: 500,
    });

    expect(result.hasChanges).toBe(true);
    if (result.hasChanges) {
      expect(result.executionTimeMs).toBe(500);
    }
  });
});

describe("getToolsAtVersion", () => {
  const allChanges: ToolChanges[] = [
    {
      hasChanges: true,
      added: [{ name: "tool1", description: "v1で追加" }],
      removed: [],
      modified: [],
    },
    {
      hasChanges: true,
      added: [{ name: "tool2", description: "v2で追加" }],
      removed: [],
      modified: [],
    },
    {
      hasChanges: true,
      added: [],
      removed: [{ name: "tool1", description: "v1で追加" }],
      modified: [],
    },
  ];

  test("バージョン1のツール状態を取得する", () => {
    const tools = getToolsAtVersion(allChanges, 1);

    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe("tool1");
  });

  test("バージョン2のツール状態を取得する", () => {
    const tools = getToolsAtVersion(allChanges, 2);

    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name).sort()).toStrictEqual(["tool1", "tool2"]);
  });

  test("バージョン3のツール状態を取得する（tool1が削除済み）", () => {
    const tools = getToolsAtVersion(allChanges, 3);

    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe("tool2");
  });

  test("バージョン0以下の場合は空配列を返す", () => {
    expect(getToolsAtVersion(allChanges, 0)).toStrictEqual([]);
    expect(getToolsAtVersion(allChanges, -1)).toStrictEqual([]);
  });

  test("存在しないバージョンの場合は空配列を返す", () => {
    expect(getToolsAtVersion(allChanges, 100)).toStrictEqual([]);
  });

  test("空の changes 配列の場合は空配列を返す", () => {
    expect(getToolsAtVersion([], 1)).toStrictEqual([]);
  });
});

describe("getPendingChanges", () => {
  test("currentVersion が null の場合、最初のCLEANバージョンまでの変更を返す", () => {
    const allChanges: ToolChanges[] = [
      {
        hasChanges: true,
        added: [{ name: "tool1", description: "追加" }],
        removed: [],
        modified: [],
      },
    ];
    const allVulnerabilities: unknown[][] = [[]]; // CLEAN

    const result = getPendingChanges(allChanges, allVulnerabilities, null);

    expect(result).not.toBeNull();
    expect(result?.targetVersion).toBe(1);
    expect(result?.cumulativeChanges.added).toHaveLength(1);
  });

  test("VULNERABLEバージョンをスキップして最新CLEANを見つける", () => {
    const allChanges: ToolChanges[] = [
      {
        hasChanges: true,
        added: [{ name: "tool1", description: "v1" }],
        removed: [],
        modified: [],
      },
      {
        hasChanges: true,
        added: [{ name: "tool2", description: "v2" }],
        removed: [],
        modified: [],
      },
      {
        hasChanges: true,
        added: [{ name: "tool3", description: "v3" }],
        removed: [],
        modified: [],
      },
    ];
    const allVulnerabilities: unknown[][] = [
      [], // v1: CLEAN
      [{ type: "tool_poisoning" }], // v2: VULNERABLE
      [], // v3: CLEAN
    ];

    const result = getPendingChanges(allChanges, allVulnerabilities, 1);

    expect(result).not.toBeNull();
    expect(result?.targetVersion).toBe(3);
  });

  test("currentVersion 以降にCLEANバージョンがない場合は null を返す", () => {
    const allChanges: ToolChanges[] = [
      {
        hasChanges: true,
        added: [{ name: "tool1", description: "v1" }],
        removed: [],
        modified: [],
      },
      {
        hasChanges: true,
        added: [{ name: "tool2", description: "v2" }],
        removed: [],
        modified: [],
      },
    ];
    const allVulnerabilities: unknown[][] = [
      [], // v1: CLEAN
      [{ type: "tool_poisoning" }], // v2: VULNERABLE
    ];

    const result = getPendingChanges(allChanges, allVulnerabilities, 1);

    expect(result).toBeNull();
  });

  test("既に最新バージョンが承認済みの場合は null を返す", () => {
    const allChanges: ToolChanges[] = [
      {
        hasChanges: true,
        added: [{ name: "tool1", description: "v1" }],
        removed: [],
        modified: [],
      },
    ];
    const allVulnerabilities: unknown[][] = [[]];

    const result = getPendingChanges(allChanges, allVulnerabilities, 1);

    expect(result).toBeNull();
  });
});

describe("mergeChanges", () => {
  test("空の配列の場合は変更なしを返す", () => {
    const result = mergeChanges([]);

    expect(result.hasChanges).toBe(false);
    expect(result.added).toStrictEqual([]);
    expect(result.removed).toStrictEqual([]);
    expect(result.modified).toStrictEqual([]);
  });

  test("単一の変更はそのまま返す", () => {
    const changes: ToolChanges = {
      hasChanges: true,
      added: [{ name: "tool1", description: "追加" }],
      removed: [],
      modified: [],
    };

    const result = mergeChanges([changes]);

    expect(result).toStrictEqual(changes);
  });

  test("複数の変更をマージする", () => {
    const changesList: ToolChanges[] = [
      {
        hasChanges: true,
        added: [{ name: "tool1", description: "v1で追加" }],
        removed: [],
        modified: [],
      },
      {
        hasChanges: true,
        added: [{ name: "tool2", description: "v2で追加" }],
        removed: [],
        modified: [
          {
            name: "tool1",
            field: "description",
            before: "v1で追加",
            after: "v2で更新",
          },
        ],
      },
    ];

    const result = mergeChanges(changesList);

    expect(result.hasChanges).toBe(true);
    // 最終状態: tool1(v2で更新), tool2(v2で追加)
    expect(result.added).toHaveLength(2);
  });

  test("追加後に削除された場合は相殺される", () => {
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

    const result = mergeChanges(changesList);

    expect(result.hasChanges).toBe(false);
    expect(result.added).toStrictEqual([]);
    expect(result.removed).toStrictEqual([]);
  });
});

describe("createInitialChanges", () => {
  test("空のツール配列の場合は hasChanges: false を返す", () => {
    const result = createInitialChanges([]);

    expect(result.hasChanges).toBe(false);
    expect(result.added).toStrictEqual([]);
    expect(result.removed).toStrictEqual([]);
    expect(result.modified).toStrictEqual([]);
  });

  test("ツールを全て added として変換する", () => {
    const tools: ToolSnapshot[] = [
      { name: "tool1", description: "説明1", inputSchema: {} },
      { name: "tool2", description: "説明2", inputSchema: { type: "object" } },
    ];

    const result = createInitialChanges(tools);

    expect(result.hasChanges).toBe(true);
    expect(result.added).toStrictEqual([
      { name: "tool1", description: "説明1" },
      { name: "tool2", description: "説明2" },
    ]);
    expect(result.removed).toStrictEqual([]);
    expect(result.modified).toStrictEqual([]);
  });
});
