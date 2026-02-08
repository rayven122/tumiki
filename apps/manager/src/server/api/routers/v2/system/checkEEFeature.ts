import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import type { EEFeature, EEFeatureInfo } from "@/features/ee";

/**
 * EE機能の入力スキーマ
 */
const EEFeatureSchema = z.enum([
  "member-management",
  "role-management",
  "group-management",
  "organization-creation",
]);

/**
 * EE機能チェックの入力スキーマ
 */
const CheckEEFeatureInputSchema = z.object({
  feature: EEFeatureSchema.optional(),
});

/**
 * EE機能チェックの出力スキーマ
 */
type CheckEEFeatureOutput =
  | {
      // 全機能情報を返す場合
      eeAvailable: boolean;
      features: EEFeatureInfo[];
    }
  | {
      // 特定機能のチェック結果を返す場合
      feature: EEFeature;
      available: boolean;
    };

/**
 * EE機能をチェックするプロシージャ
 *
 * 動的インポートでEE機能の存在を確認し、
 * EE版が利用可能かどうかを返す。
 *
 * - feature指定なし: 全EE機能の情報を返す
 * - feature指定あり: 指定された機能の有効/無効を返す
 */
export const checkEEFeature = publicProcedure
  .input(CheckEEFeatureInputSchema)
  .query(async ({ input }): Promise<CheckEEFeatureOutput> => {
    // 動的インポートでEEモジュールの存在を確認
    const eeModule = await tryImportEEModule();

    if (input.feature) {
      // 特定機能のチェック
      const available = eeModule?.isEEFeatureAvailable(input.feature) ?? false;
      return {
        feature: input.feature,
        available,
      };
    }

    // 全機能情報を返す
    return {
      eeAvailable: eeModule?.EE_AVAILABLE ?? false,
      features: eeModule?.getAllEEFeatureInfo() ?? getCEFeatureInfo(),
    };
  });

/**
 * EEモジュールを動的にインポート
 * EEモジュールが存在しない場合はnullを返す
 */
const tryImportEEModule = async () => {
  try {
    // EEモジュールを動的インポート
    // ビルド時にEEファイルが除外されている場合はエラーになる
    const eeModule = await import("@/features/ee/index.ee");
    return eeModule;
  } catch {
    // EEモジュールが存在しない場合（CE版）
    return null;
  }
};

/**
 * CE版のデフォルト機能情報
 */
const getCEFeatureInfo = (): EEFeatureInfo[] => [
  {
    feature: "member-management",
    available: false,
    description: "組織メンバーの管理機能",
  },
  {
    feature: "role-management",
    available: false,
    description: "ロールベースのアクセス制御機能",
  },
  {
    feature: "group-management",
    available: false,
    description: "グループ管理機能",
  },
  {
    feature: "organization-creation",
    available: false,
    description: "新規組織作成機能",
  },
];
