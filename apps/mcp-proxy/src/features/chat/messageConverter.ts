/**
 * DBメッセージをAI SDK 6形式に変換するユーティリティ
 *
 * 実装は features/execution/shared/messageConverter.ts に移動
 * 後方互換性のため re-export
 */

export {
  convertDBMessagesToAISDK6Format,
  type UIMessage,
} from "../execution/index.js";
