"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, type RouterOutputs } from "@/trpc/react";
import { toast } from "sonner";
import { useAtom } from "jotai";
import { integratedFlowStateAtom } from "@/atoms/integratedFlowAtoms";
import { StepIndicator } from "./StepIndicator";
import { TemplateSelector } from "./TemplateSelector";
import { ToolSelector } from "./ToolSelector";
import { ServerInfoForm } from "./ServerInfoForm";
import { ReviewStep } from "./ReviewStep";
import {
  useConnectionConfigs,
  findConnectionConfig,
} from "../_hooks/useConnectionConfigs";
import { prepareTemplateData } from "../_utils/prepareTemplateData";

type CreateIntegratedPageClientProps = {
  orgSlug: string;
};

type OfficialServers =
  RouterOutputs["v2"]["userMcpServer"]["findOfficialServers"];

/**
 * 統合サーバー作成ページのメインクライアントコンポーネント
 *
 * 用語マッピング:
 * - serviceTemplate (McpServerTemplate): サービステンプレート - 全ユーザー共通のカタログ
 * - connectionConfig (McpServerTemplateInstance): 接続設定 - ユーザーが認証情報を設定したインスタンス
 * - integratedServer (McpServer): 統合サーバー - 複数の接続設定を束ねて公開するサーバー
 *
 * このフローでは既存の設定済み接続設定（connectionConfig）のみを選択可能
 * OAuth認証や環境変数入力は不要（既に設定済み）
 */
export const CreateIntegratedPageClient = ({
  orgSlug,
}: CreateIntegratedPageClientProps) => {
  const router = useRouter();

  // Jotaiで状態管理
  const [flowState, setFlowState] = useAtom(integratedFlowStateAtom);

  const totalSteps = 4;
  const stepLabels = [
    "接続設定を選択",
    "ツールを選択",
    "サーバー情報を入力",
    "確認",
  ];

  // 状態更新関数
  const updateFlowState = (updates: Partial<typeof flowState>) => {
    setFlowState((prev) => ({ ...prev, ...updates }));
  };

  // データ取得（設定済み接続設定のみ必要）
  const { data: officialServers, isLoading: isLoadingOfficialServers } =
    api.v2.userMcpServer.findOfficialServers.useQuery();

  const isLoading = isLoadingOfficialServers;

  // 全接続設定を取得（型安全＋パフォーマンス最適化）
  const allConnectionConfigs = useConnectionConfigs(officialServers);

  // 統合サーバー作成mutation
  const { mutate: createIntegrated, isPending } =
    api.v2.userMcpServer.createIntegratedMcpServer.useMutation({
      onSuccess: (data) => {
        toast.success("統合サーバーを作成しました");
        router.push(`/${orgSlug}/mcps/${data.id}`);
      },
      onError: (error) => {
        toast.error(`エラー: ${error.message}`);
      },
    });

  // 接続設定（インスタンス）選択ハンドラ
  const handleToggleInstance = (instanceId: string) => {
    if (flowState.selectedInstanceIds.includes(instanceId)) {
      // 削除: 選択を解除し、ツール選択もクリア
      const remainingToolSelections = Object.fromEntries(
        Object.entries(flowState.toolSelections).filter(
          ([key]) => key !== instanceId,
        ),
      );

      updateFlowState({
        selectedInstanceIds: flowState.selectedInstanceIds.filter(
          (id) => id !== instanceId,
        ),
        toolSelections: remainingToolSelections,
      });
    } else {
      // 追加: デフォルトで全ツール選択
      const connectionConfig = findConnectionConfig(
        allConnectionConfigs,
        instanceId,
      );
      if (connectionConfig) {
        const allToolIds = connectionConfig.tools.map((t) => t.id);

        updateFlowState({
          selectedInstanceIds: [...flowState.selectedInstanceIds, instanceId],
          toolSelections: {
            ...flowState.toolSelections,
            [instanceId]: allToolIds,
          },
        });
      }
    }
  };

  // ツール選択ハンドラ
  const handleToggleTool = (instanceId: string, toolId: string) => {
    const currentTools = flowState.toolSelections[instanceId] ?? [];
    const newTools = currentTools.includes(toolId)
      ? currentTools.filter((id) => id !== toolId)
      : [...currentTools, toolId];

    updateFlowState({
      toolSelections: {
        ...flowState.toolSelections,
        [instanceId]: newTools,
      },
    });
  };

  // 全ツール選択
  const handleSelectAllTools = (instanceId: string) => {
    const connectionConfig = findConnectionConfig(
      allConnectionConfigs,
      instanceId,
    );
    if (connectionConfig) {
      updateFlowState({
        toolSelections: {
          ...flowState.toolSelections,
          [instanceId]: connectionConfig.tools.map((t) => t.id),
        },
      });
    }
  };

  // 全ツール解除
  const handleDeselectAllTools = (instanceId: string) => {
    updateFlowState({
      toolSelections: {
        ...flowState.toolSelections,
        [instanceId]: [],
      },
    });
  };

  // ステップ進行可否の判定
  const canProceedToStep2 = flowState.selectedInstanceIds.length >= 2;
  const canProceedToStep3 = useMemo(() => {
    // 各接続設定で最低1つのツールが選択されているか確認
    return flowState.selectedInstanceIds.every((instanceId) => {
      const tools = flowState.toolSelections[instanceId] ?? [];
      return tools.length > 0;
    });
  }, [flowState.selectedInstanceIds, flowState.toolSelections]);
  const canProceedToStep4 = flowState.serverName.trim().length > 0;

  // 統合サーバー作成実行
  const handleCreate = () => {
    try {
      // 選択された接続設定のデータを準備
      const templateData = prepareTemplateData(
        flowState.selectedInstanceIds,
        flowState.toolSelections,
        allConnectionConfigs,
      );

      createIntegrated({
        name: flowState.serverName,
        description: flowState.serverDescription || undefined,
        templates: templateData,
      });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("統合サーバーの作成に失敗しました");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (allConnectionConfigs.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p>設定済みの接続設定がありません</p>
        <p className="mt-2 text-sm text-gray-500">
          先にサービスを接続してから、統合サーバーを作成してください。
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/${orgSlug}/mcps`}>
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">統合サーバーを作成</h1>
        </div>
      </div>

      {/* ステップインジケーター */}
      <StepIndicator
        currentStep={flowState.currentStep}
        totalSteps={totalSteps}
        stepLabels={stepLabels}
      />

      {/* ステップ内容 */}
      <div className="mb-8">
        {flowState.currentStep === 1 && (
          <TemplateSelector
            officialServers={officialServers}
            selectedInstanceIds={flowState.selectedInstanceIds}
            onToggleInstance={handleToggleInstance}
          />
        )}

        {flowState.currentStep === 2 && (
          <ToolSelector
            officialServers={officialServers}
            selectedInstanceIds={flowState.selectedInstanceIds}
            toolSelections={flowState.toolSelections}
            onToggleTool={handleToggleTool}
            onSelectAllTools={handleSelectAllTools}
            onDeselectAllTools={handleDeselectAllTools}
          />
        )}

        {flowState.currentStep === 3 && (
          <ServerInfoForm
            serverName={flowState.serverName}
            serverDescription={flowState.serverDescription}
            officialServers={officialServers}
            selectedInstanceIds={flowState.selectedInstanceIds}
            toolSelections={flowState.toolSelections}
            onServerNameChange={(name) => updateFlowState({ serverName: name })}
            onServerDescriptionChange={(desc) =>
              updateFlowState({ serverDescription: desc })
            }
          />
        )}

        {flowState.currentStep === 4 && (
          <ReviewStep
            serverName={flowState.serverName}
            serverDescription={flowState.serverDescription}
            officialServers={officialServers}
            selectedInstanceIds={flowState.selectedInstanceIds}
            toolSelections={flowState.toolSelections}
          />
        )}
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        <Button
          variant="outline"
          onClick={() =>
            updateFlowState({ currentStep: flowState.currentStep - 1 })
          }
          disabled={flowState.currentStep === 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>

        <div>
          {flowState.currentStep < totalSteps ? (
            <Button
              onClick={() =>
                updateFlowState({ currentStep: flowState.currentStep + 1 })
              }
              disabled={
                (flowState.currentStep === 1 && !canProceedToStep2) ||
                (flowState.currentStep === 2 && !canProceedToStep3) ||
                (flowState.currentStep === 3 && !canProceedToStep4)
              }
            >
              次へ
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? "作成中..." : "統合サーバーを作成"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
