import { z } from "zod";

/**
 * ツールスナップショット（バージョン管理用）
 */
export const ToolSnapshotSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
});

export type ToolSnapshot = z.infer<typeof ToolSnapshotSchema>;

/**
 * 変更されたツールの詳細
 */
export const ModifiedToolSchema = z.object({
  name: z.string(),
  field: z.enum(["description", "inputSchema"]),
  before: z.string(),
  after: z.string(),
});

export type ModifiedTool = z.infer<typeof ModifiedToolSchema>;

/**
 * ツール変更差分
 */
export const ToolChangesSchema = z.object({
  hasChanges: z.boolean(),
  added: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    }),
  ),
  removed: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    }),
  ),
  modified: z.array(ModifiedToolSchema),
});

export type ToolChanges = z.infer<typeof ToolChangesSchema>;
