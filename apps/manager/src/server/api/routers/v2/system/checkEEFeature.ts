import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import {
  EE_AVAILABLE,
  getAllEEFeatureInfo,
  isEEFeatureAvailable,
  type EEFeature,
  type EEFeatureInfo,
} from "@/features/ee";

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
 * ビルド時に環境変数で決定されたEE機能の状態を返す。
 *
 * - feature指定なし: 全EE機能の情報を返す
 * - feature指定あり: 指定された機能の有効/無効を返す
 */
export const checkEEFeature = publicProcedure
  .input(CheckEEFeatureInputSchema)
  .query(({ input }): CheckEEFeatureOutput => {
    if (input.feature) {
      // 特定機能のチェック
      return {
        feature: input.feature,
        available: isEEFeatureAvailable(input.feature),
      };
    }

    // 全機能情報を返す
    return {
      eeAvailable: EE_AVAILABLE,
      features: getAllEEFeatureInfo(),
    };
  });
