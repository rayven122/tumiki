"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
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

  // ステップ管理
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const stepLabels = ["テンプレート選択", "ツール選択", "サーバー情報", "確認"];

  // 選択状態
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [toolSelections, setToolSelections] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [envVars, setEnvVars] = useState<Map<string, Record<string, string>>>(
    new Map(),
  );
  const [serverName, setServerName] = useState("");
  const [serverDescription, setServerDescription] = useState("");

  // データ取得
  const { data: templates, isLoading: isLoadingTemplates } =
    api.v2.mcpServer.findAll.useQuery();
  const { data: officialServers, isLoading: isLoadingOfficialServers } =
    api.v2.userMcpServer.findOfficialServers.useQuery();

  const isLoading = isLoadingTemplates || isLoadingOfficialServers;

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
    setSelectedTemplateIds((prev) => {
      if (prev.includes(templateId)) {
        // 削除
        const newSelections = new Map(toolSelections);
        newSelections.delete(templateId);
        setToolSelections(newSelections);

        const newEnvVars = new Map(envVars);
        newEnvVars.delete(templateId);
        setEnvVars(newEnvVars);

        return prev.filter((id) => id !== templateId);
      } else {
        // 追加：デフォルトで全ツール選択
        const template = templates?.find((t) => t.id === templateId);
        if (template) {
          const newSelections = new Map(toolSelections);
          newSelections.set(
            templateId,
            new Set(template.mcpTools.map((t) => t.id)),
          );
          setToolSelections(newSelections);

          // 設定済みtemplate instanceかどうかを確認
          const isConfigured = officialServers?.some((server) =>
            server.templateInstances.some(
              (instance) => instance.mcpServerTemplateId === templateId,
            ),
          );

          // 環境変数の初期化（未設定テンプレートのみ）
          if (template.envVarKeys.length > 0 && !isConfigured) {
            const newEnvVars = new Map(envVars);
            newEnvVars.set(
              templateId,
              Object.fromEntries(template.envVarKeys.map((key) => [key, ""])),
            );
            setEnvVars(newEnvVars);
          }
        }
        return [...prev, templateId];
      }
    });
  };

  // ツール選択ハンドラ
  const handleToggleTool = (templateId: string, toolId: string) => {
    setToolSelections((prev) => {
      const newSelections = new Map(prev);
      const tools = newSelections.get(templateId) ?? new Set();

      if (tools.has(toolId)) {
        tools.delete(toolId);
      } else {
        tools.add(toolId);
      }

      newSelections.set(templateId, tools);
      return newSelections;
    });
  };

  // 全ツール選択
  const handleSelectAllTools = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      setToolSelections((prev) => {
        const newSelections = new Map(prev);
        newSelections.set(
          templateId,
          new Set(template.mcpTools.map((t) => t.id)),
        );
        return newSelections;
      });
    }
  };

  // 全ツール解除
  const handleDeselectAllTools = (templateId: string) => {
    setToolSelections((prev) => {
      const newSelections = new Map(prev);
      newSelections.set(templateId, new Set());
      return newSelections;
    });
  };

  // 環境変数変更ハンドラ
  const handleEnvVarChange = (
    templateId: string,
    key: string,
    value: string,
  ) => {
    setEnvVars((prev) => {
      const newEnvVars = new Map(prev);
      const templateEnvVars = newEnvVars.get(templateId) ?? {};
      newEnvVars.set(templateId, { ...templateEnvVars, [key]: value });
      return newEnvVars;
    });
  };

  // ステップ進行可否の判定
  const canProceedToStep2 = selectedTemplateIds.length >= 2;
  const canProceedToStep3 = useMemo(() => {
    // 各テンプレートで最低1つのツールが選択されているか確認
    return selectedTemplateIds.every((templateId) => {
      const tools = toolSelections.get(templateId) ?? new Set();
      return tools.size > 0;
    });
  }, [selectedTemplateIds, toolSelections]);
  const canProceedToStep4 = serverName.trim().length > 0;

  // 作成実行
  const handleCreate = () => {
    // 入力データの準備
    const templateData: TemplateSelection[] = selectedTemplateIds.map(
      (templateId) => {
        const template = templates?.find((t) => t.id === templateId);
        const tools = toolSelections.get(templateId) ?? new Set();
        const templateEnvVars = envVars.get(templateId) ?? {};

        return {
          templateId,
          normalizedName: normalizeServerName(template?.name ?? templateId),
          selectedToolIds: Array.from(tools),
          envVars: templateEnvVars,
        };
      },
    );

    createIntegrated({
      name: serverName,
      description: serverDescription || undefined,
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
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabels={stepLabels}
      />

      {/* ステップ内容 */}
      <div className="mb-8">
        {currentStep === 1 && (
          <TemplateSelector
            templates={templates}
            officialServers={officialServers}
            selectedTemplateIds={selectedTemplateIds}
            onToggleTemplate={handleToggleTemplate}
          />
        )}

        {currentStep === 2 && (
          <ToolSelector
            templates={templates}
            selectedTemplateIds={selectedTemplateIds}
            toolSelections={toolSelections}
            envVars={envVars}
            officialServers={officialServers}
            onToggleTool={handleToggleTool}
            onSelectAllTools={handleSelectAllTools}
            onDeselectAllTools={handleDeselectAllTools}
            onEnvVarChange={handleEnvVarChange}
          />
        )}

        {currentStep === 3 && (
          <ServerInfoForm
            serverName={serverName}
            serverDescription={serverDescription}
            templates={templates}
            selectedTemplateIds={selectedTemplateIds}
            toolSelections={toolSelections}
            onServerNameChange={setServerName}
            onServerDescriptionChange={setServerDescription}
          />
        )}

        {currentStep === 4 && (
          <ReviewStep
            serverName={serverName}
            serverDescription={serverDescription}
            templates={templates}
            selectedTemplateIds={selectedTemplateIds}
            toolSelections={toolSelections}
          />
        )}
      </div>

      {/* ナビゲーションボタン */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((prev) => prev - 1)}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>

        <div>
          {currentStep < totalSteps ? (
            <Button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              disabled={
                (currentStep === 1 && !canProceedToStep2) ||
                (currentStep === 2 && !canProceedToStep3) ||
                (currentStep === 3 && !canProceedToStep4)
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
