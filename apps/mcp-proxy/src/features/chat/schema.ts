/**
 * チャットAPIリクエスト/レスポンススキーマ
 *
 * 実装は features/execution/shared/schema.ts に移動
 * 後方互換性のため re-export
 */

export {
  postRequestBodySchema,
  convertToolState,
  type PostRequestBody,
  type ToolState,
  type DBToolPart,
} from "../execution/index.js";
