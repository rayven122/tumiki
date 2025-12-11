"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useAtom } from "jotai";
import { integratedFlowStateAtom } from "@/atoms/integratedFlowAtoms";
import { StepIndicator } from "./StepIndicator";
import { TemplateSelector } from "./TemplateSelector";
import { ToolSelector } from "./ToolSelector";
import { ServerInfoForm } from "./ServerInfoForm";
import { ReviewStep } from "./ReviewStep";
import { normalizeServerName } from "@/utils/normalizeServerName";

type CreateIntegratedPageClientProps = {
  orgSlug: string;
};

type TemplateSelection = {
  templateId: string;
  normalizedName: string;
  selectedToolIds: string[];
  envVars: Record<string, string>;
};

/**
 * 統合MCPサーバー作成ページのメインクライアントコンポーネント
 */
export const CreateIntegratedPageClient = ({
  orgSlug,
}: CreateIntegratedPageClientProps) => {
  const router = useRouter();

  // Jotaiで状態管理（sessionStorageと自動同期）
  const [flowState, setFlowState] = useAtom(integratedFlowStateAtom);

  const totalSteps = 4;
  const stepLabels = ["テンプレート選択", "ツール選択", "サーバー情報", "確認"];

  // 状態更新関数
  const updateFlowState = (
    updates: Partial<typeof flowState>,
  ) => {
    setFlowState((prev) => ({ ...prev, ...updates }));
  };

  // データ取得
  const { data: templates, isLoading: isLoadingTemplates } =
    api.v2.mcpServer.findAll.useQuery();
  const {
    data: officialServers,
    isLoading: isLoadingOfficialServers,
    refetch: refetchOfficialServers,
  } = api.v2.userMcpServer.findOfficialServers.useQuery();

  const isLoading = isLoadingTemplates || isLoadingOfficialServers;

  // OAuth認証コールバック処理
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isOAuthCallback = searchParams.get("oauth_callback") === "true";
    const templateId = searchParams.get("template_id");
    const error = searchParams.get("error");

    if (isOAuthCallback) {
      if (error) {
        toast.error(`OAuth認証エラー: ${decodeURIComponent(error)}`);
      } else if (templateId) {
        // 成功: テンプレート情報をrefetch
        void refetchOfficialServers().then(() => {
          toast.success("OAuth認証が完了しました");
        });
      }

      // URLパラメータをクリア
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refetchOfficialServers]);

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

  // テンプレート選択ハンドラ
  const handleToggleTemplate = (templateId: string) => {
    if (flowState.selectedTemplateIds.includes(templateId)) {
      // 削除
      const { [templateId]: _, ...remainingToolSelections } =
        flowState.toolSelections;
      const { [templateId]: __, ...remainingEnvVars } = flowState.envVars;

      updateFlowState({
        selectedTemplateIds: flowState.selectedTemplateIds.filter(
          (id) => id !== templateId,
        ),
        toolSelections: remainingToolSelections,
        envVars: remainingEnvVars,
      });
    } else {
      // 追加：デフォルトで全ツール選択
      const template = templates?.find((t) => t.id === templateId);
      if (template) {
        const allToolIds = template.mcpTools.map((t) => t.id);

        // 設定済みtemplate instanceかどうかを確認
        const isConfigured = officialServers?.some((server) =>
          server.templateInstances.some(
            (instance) => instance.mcpServerTemplateId === templateId,
          ),
        );

        // 環境変数の初期化（未設定テンプレートのみ）
        const newEnvVars =
          template.envVarKeys.length > 0 && !isConfigured
            ? {
                ...flowState.envVars,
                [templateId]: Object.fromEntries(
                  template.envVarKeys.map((key) => [key, ""]),
                ),
              }
            : flowState.envVars;

        updateFlowState({
          selectedTemplateIds: [...flowState.selectedTemplateIds, templateId],
          toolSelections: {
            ...flowState.toolSelections,
            [templateId]: allToolIds,
          },
          envVars: newEnvVars,
        });
      }
    }
  };

  // ツール選択ハンドラ
  const handleToggleTool = (templateId: string, toolId: string) => {
    const currentTools = flowState.toolSelections[templateId] || [];
    const newTools = currentTools.includes(toolId)
      ? currentTools.filter((id) => id !== toolId)
      : [...currentTools, toolId];

    updateFlowState({
      toolSelections: {
        ...flowState.toolSelections,
        [templateId]: newTools,
      },
    });
  };

  // 全ツール選択
  const handleSelectAllTools = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      updateFlowState({
        toolSelections: {
          ...flowState.toolSelections,
          [templateId]: template.mcpTools.map((t) => t.id),
        },
      });
    }
  };

  // 全ツール解除
  const handleDeselectAllTools = (templateId: string) => {
    updateFlowState({
      toolSelections: {
        ...flowState.toolSelections,
        [templateId]: [],
      },
    });
  };

  // 環境変数変更ハンドラ
  const handleEnvVarChange = (
    templateId: string,
    key: string,
    value: string,
  ) => {
    const templateEnvVars = flowState.envVars[templateId] ?? {};
    updateFlowState({
      envVars: {
        ...flowState.envVars,
        [templateId]: { ...templateEnvVars, [key]: value },
      },
    });
  };

  // ステップ進行可否の判定
  const canProceedToStep2 = flowState.selectedTemplateIds.length >= 2;
  const canProceedToStep3 = useMemo(() => {
    // 各テンプレートで最低1つのツールが選択されているか確認
    return flowState.selectedTemplateIds.every((templateId) => {
      const tools = flowState.toolSelections[templateId] ?? [];
      return tools.length > 0;
    });
  }, [flowState.selectedTemplateIds, flowState.toolSelections]);
  const canProceedToStep4 = flowState.serverName.trim().length > 0;

  // 作成実行
  const handleCreate = () => {
    // 入力データの準備
    const templateData: TemplateSelection[] = flowState.selectedTemplateIds.map(
      (templateId) => {
        const template = templates?.find((t) => t.id === templateId);
        const tools = flowState.toolSelections[templateId] ?? [];
        const templateEnvVars = flowState.envVars[templateId] ?? {};

        return {
          templateId,
          normalizedName: normalizeServerName(template?.name ?? templateId),
          selectedToolIds: tools,
          envVars: templateEnvVars,
        };
      },
    );

    createIntegrated({
      name: flowState.serverName,
      description: flowState.serverDescription || undefined,
      templates: templateData.map((t) => ({
        mcpServerTemplateId: t.templateId,
        normalizedName: t.normalizedName,
        toolIds: t.selectedToolIds,
        envVars: Object.keys(t.envVars).length > 0 ? t.envVars : undefined,
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p>利用可能なテンプレートがありません</p>
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
          <h1 className="text-2xl font-bold">統合MCPサーバーを作成</h1>
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
            templates={templates}
            officialServers={officialServers}
            selectedTemplateIds={flowState.selectedTemplateIds}
            onToggleTemplate={handleToggleTemplate}
          />
        )}

        {flowState.currentStep === 2 && (
          <ToolSelector
            templates={templates}
            selectedTemplateIds={flowState.selectedTemplateIds}
            toolSelections={flowState.toolSelections}
            envVars={flowState.envVars}
            officialServers={officialServers}
            onToggleTool={handleToggleTool}
            onSelectAllTools={handleSelectAllTools}
            onDeselectAllTools={handleDeselectAllTools}
            onEnvVarChange={handleEnvVarChange}
          />
        )}

        {flowState.currentStep === 3 && (
          <ServerInfoForm
            serverName={flowState.serverName}
            serverDescription={flowState.serverDescription}
            templates={templates}
            selectedTemplateIds={flowState.selectedTemplateIds}
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
            templates={templates}
            selectedTemplateIds={flowState.selectedTemplateIds}
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
