/**
 * EE/CE エディション機能
 *
 * ビルド時に環境変数で判定される。
 * NEXT_PUBLIC_EE_BUILD=true -> EE版
 * 未設定または false -> CE版
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
