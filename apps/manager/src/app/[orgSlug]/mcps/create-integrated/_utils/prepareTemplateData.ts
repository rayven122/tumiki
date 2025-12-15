import type { ConnectionConfigInstance } from "../_hooks/useConnectionConfigs";
import {
  findConnectionConfig,
  getConnectionConfigDisplayName,
} from "../_hooks/useConnectionConfigs";

type TemplateData = {
  mcpServerTemplateId: string;
  normalizedName: string;
  toolIds: string[];
};

/**
 * 統合サーバー作成用のテンプレートデータを準備する
 *
 * @param selectedInstanceIds - 選択された接続設定ID
 * @param toolSelections - ツール選択状態
 * @param allConnectionConfigs - 全接続設定
 * @returns テンプレートデータ配列
 */
export const prepareTemplateData = (
  selectedInstanceIds: string[],
  toolSelections: Record<string, string[]>,
  allConnectionConfigs: ConnectionConfigInstance[],
): TemplateData[] => {
  return selectedInstanceIds.map((instanceId) => {
    const connectionConfig = findConnectionConfig(
      allConnectionConfigs,
      instanceId,
    );

    if (!connectionConfig) {
      throw new Error(`接続設定が見つかりません: ${instanceId}`);
    }

    const tools = toolSelections[instanceId] ?? [];

    if (tools.length === 0) {
      throw new Error(
        `少なくとも1つのツールを選択してください: ${getConnectionConfigDisplayName(connectionConfig)}`,
      );
    }

    return {
      mcpServerTemplateId: connectionConfig.mcpServerTemplateId,
      normalizedName: getConnectionConfigDisplayName(connectionConfig),
      toolIds: tools,
      // envVarsは未指定にすることで、バックエンドが既存のenvVarsを自動的に使用
    };
  });
};
