import type { ToolChanges, ToolSnapshot } from "./types.js";

/**
 * 2つのツール一覧の差分を検出
 *
 * @param previousTools 前回のツール一覧
 * @param currentTools 現在のツール一覧
 * @returns 差分情報
 */
export const detectToolChanges = (
  previousTools: ToolSnapshot[],
  currentTools: ToolSnapshot[],
): ToolChanges => {
  const previousMap = new Map(previousTools.map((t) => [t.name, t]));
  const currentMap = new Map(currentTools.map((t) => [t.name, t]));

  const added: ToolChanges["added"] = [];
  const removed: ToolChanges["removed"] = [];
  const modified: ToolChanges["modified"] = [];

  // 追加されたツールを検出
  for (const tool of currentTools) {
    if (!previousMap.has(tool.name)) {
      added.push({
        name: tool.name,
        description: tool.description,
      });
    }
  }

  // 削除されたツールを検出
  for (const tool of previousTools) {
    if (!currentMap.has(tool.name)) {
      removed.push({
        name: tool.name,
        description: tool.description,
      });
    }
  }

  // 変更されたツールを検出
  for (const currentTool of currentTools) {
    const previousTool = previousMap.get(currentTool.name);
    if (!previousTool) continue;

    // description の変更をチェック
    if (previousTool.description !== currentTool.description) {
      modified.push({
        name: currentTool.name,
        field: "description",
        before: previousTool.description,
        after: currentTool.description,
      });
    }

    // inputSchema の変更をチェック
    const prevSchema = JSON.stringify(previousTool.inputSchema);
    const currSchema = JSON.stringify(currentTool.inputSchema);
    if (prevSchema !== currSchema) {
      modified.push({
        name: currentTool.name,
        field: "inputSchema",
        before: prevSchema,
        after: currSchema,
      });
    }
  }

  const hasChanges =
    added.length > 0 || removed.length > 0 || modified.length > 0;

  return {
    hasChanges,
    added,
    removed,
    modified,
  };
};

/**
 * ベースラインに差分を適用してツール一覧を再構築
 *
 * @param baseline ベースラインのツール一覧
 * @param changes 適用する差分
 * @returns 再構築されたツール一覧
 */
export const applyChangesToTools = (
  baseline: ToolSnapshot[],
  changes: ToolChanges,
): ToolSnapshot[] => {
  // ベースラインをコピー
  const tools = new Map(baseline.map((t) => [t.name, { ...t }]));

  // 削除を適用
  for (const removed of changes.removed) {
    tools.delete(removed.name);
  }

  // 追加を適用（description のみ保存されているので inputSchema は空）
  for (const added of changes.added) {
    tools.set(added.name, {
      name: added.name,
      description: added.description,
      inputSchema: {},
    });
  }

  // 変更を適用
  for (const mod of changes.modified) {
    const tool = tools.get(mod.name);
    if (!tool) continue;

    if (mod.field === "description") {
      tool.description = mod.after;
    } else if (mod.field === "inputSchema") {
      tool.inputSchema = JSON.parse(mod.after) as Record<string, unknown>;
    }
  }

  return Array.from(tools.values());
};

/**
 * 複数の差分を順に適用してツール一覧を再構築
 *
 * @param baseline ベースラインのツール一覧
 * @param changesList 適用する差分の配列（古い順）
 * @returns 再構築されたツール一覧
 */
export const reconstructToolsFromChanges = (
  baseline: ToolSnapshot[],
  changesList: ToolChanges[],
): ToolSnapshot[] => {
  let tools = baseline;
  for (const changes of changesList) {
    tools = applyChangesToTools(tools, changes);
  }
  return tools;
};
