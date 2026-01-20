import type { ToolChanges, ToolSnapshot } from "./types.js";
import {
  applyChangesToTools,
  detectToolChanges,
  reconstructToolsFromChanges,
} from "./diff-detector.js";

/**
 * スキャンタイプ
 */
export type ScanType = "INITIAL" | "SCHEDULED" | "MANUAL";

/**
 * バージョン作成入力
 */
export type CreateVersionInput = {
  /** 前回までの全バージョンの changes 配列（古い順） */
  previousChanges: ToolChanges[];
  /** 現在のツール一覧（リモートMCPサーバーから取得） */
  currentTools: ToolSnapshot[];
  /** スキャンタイプ */
  scanType: ScanType;
  /** 検出された脆弱性 */
  vulnerabilities: unknown[];
  /** スキャン実行時間（ミリ秒） */
  executionTimeMs: number;
};

/**
 * バージョン作成結果
 */
export type CreateVersionResult =
  | {
      /** 変更あり */
      hasChanges: true;
      /** 新しいバージョン番号 */
      version: number;
      /** 変更差分 */
      changes: ToolChanges;
      /** スキャンタイプ */
      scanType: ScanType;
      /** 脆弱性（空配列 = CLEAN） */
      vulnerabilities: unknown[];
      /** 実行時間 */
      executionTimeMs: number;
      /** 脆弱性がないか */
      isClean: boolean;
    }
  | {
      /** 変更なし */
      hasChanges: false;
    };

/**
 * 新しいバージョンを作成するかどうかを判定し、作成する場合はデータを返す
 *
 * @param input バージョン作成入力
 * @returns バージョン作成結果（変更がない場合は hasChanges: false）
 */
export const createVersionIfChanged = (
  input: CreateVersionInput,
): CreateVersionResult => {
  const {
    previousChanges,
    currentTools,
    scanType,
    vulnerabilities,
    executionTimeMs,
  } = input;

  // 前回までのツール状態を再構築
  const previousTools = reconstructToolsFromChanges([], previousChanges);

  // 差分を検出
  const changes = detectToolChanges(previousTools, currentTools);

  // 変更がない場合はバージョン作成しない
  if (!changes.hasChanges) {
    return { hasChanges: false };
  }

  // 新しいバージョン番号
  const version = previousChanges.length + 1;

  return {
    hasChanges: true,
    version,
    changes,
    scanType,
    vulnerabilities,
    executionTimeMs,
    isClean: vulnerabilities.length === 0,
  };
};

/**
 * 指定バージョンまでのツール状態を再構築
 *
 * @param allChanges 全バージョンの changes 配列（古い順）
 * @param targetVersion 対象バージョン（1から始まる）
 * @returns ツール一覧
 */
export const getToolsAtVersion = (
  allChanges: ToolChanges[],
  targetVersion: number,
): ToolSnapshot[] => {
  if (targetVersion <= 0 || targetVersion > allChanges.length) {
    return [];
  }

  // targetVersion までの changes を適用
  const changesToApply = allChanges.slice(0, targetVersion);
  return reconstructToolsFromChanges([], changesToApply);
};

/**
 * 現在の承認済みバージョンから最新CLEANバージョンまでの累積変更を取得
 *
 * @param allChanges 全バージョンの changes 配列（古い順）
 * @param allVulnerabilities 全バージョンの脆弱性配列（古い順、changes と同じ順序）
 * @param currentVersion 現在の承認済みバージョン（null = 未承認）
 * @returns 承認待ちの累積変更（最新CLEANバージョンがない場合は null）
 */
export const getPendingChanges = (
  allChanges: ToolChanges[],
  allVulnerabilities: unknown[][],
  currentVersion: number | null,
): {
  targetVersion: number;
  cumulativeChanges: ToolChanges;
} | null => {
  const startIndex = currentVersion ?? 0;

  // currentVersion より後の最新CLEANバージョンを探す
  let latestCleanIndex = -1;
  for (let i = allChanges.length - 1; i >= startIndex; i--) {
    if (allVulnerabilities[i]?.length === 0) {
      latestCleanIndex = i;
      break;
    }
  }

  // CLEANバージョンがない
  if (latestCleanIndex < startIndex) {
    return null;
  }

  // currentVersion から latestCleanVersion までの変更を累積
  const changesToMerge = allChanges.slice(startIndex, latestCleanIndex + 1);
  const cumulativeChanges = mergeChanges(changesToMerge);

  return {
    targetVersion: latestCleanIndex + 1, // 1-indexed
    cumulativeChanges,
  };
};

/**
 * 複数の変更を1つにマージ
 *
 * @param changesList 変更配列（古い順）
 * @returns マージされた変更
 */
export const mergeChanges = (changesList: ToolChanges[]): ToolChanges => {
  if (changesList.length === 0) {
    return {
      hasChanges: false,
      added: [],
      removed: [],
      modified: [],
    };
  }

  if (changesList.length === 1) {
    return changesList[0]!;
  }

  // 初期状態と最終状態を比較して差分を取得
  const initialTools: ToolSnapshot[] = [];
  const finalTools = reconstructToolsFromChanges([], changesList);

  return detectToolChanges(initialTools, finalTools);
};

/**
 * ToolSnapshot を ToolChanges の added 形式に変換
 * （初回スキャン時に使用）
 *
 * @param tools ツール一覧
 * @returns 全て added として扱う ToolChanges
 */
export const createInitialChanges = (tools: ToolSnapshot[]): ToolChanges => {
  return {
    hasChanges: tools.length > 0,
    added: tools.map((t) => ({
      name: t.name,
      description: t.description,
    })),
    removed: [],
    modified: [],
  };
};

// diff-detector の関数を再エクスポート
export { detectToolChanges, applyChangesToTools, reconstructToolsFromChanges };
