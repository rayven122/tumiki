/**
 * EE/CE エディション機能
 *
 * @tumiki/license パッケージを使用してライセンス状態を判定。
 * NEXT_PUBLIC_TUMIKI_EDITION=ee -> EE版
 * 未設定または ce -> CE版
 */
export {
  EE_AVAILABLE,
  ORG_CREATION_ENABLED,
  isEEFeatureAvailable,
  getAvailableEEFeatures,
  getAllEEFeatureInfo,
  type EEFeature,
  type EEFeatureInfo,
} from "./config";
