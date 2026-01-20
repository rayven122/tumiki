// 型定義
export type { ToolSnapshot, ToolChanges, ModifiedTool } from "./types.js";

// スキーマ（バリデーション用）
export {
  ToolSnapshotSchema,
  ToolChangesSchema,
  ModifiedToolSchema,
} from "./types.js";

// 差分検出
export {
  detectToolChanges,
  applyChangesToTools,
  reconstructToolsFromChanges,
} from "./diff-detector.js";

// バージョン管理
export type {
  ScanType,
  CreateVersionInput,
  CreateVersionResult,
} from "./version-manager.js";
export {
  createVersionIfChanged,
  getToolsAtVersion,
  getPendingChanges,
  mergeChanges,
  createInitialChanges,
} from "./version-manager.js";
