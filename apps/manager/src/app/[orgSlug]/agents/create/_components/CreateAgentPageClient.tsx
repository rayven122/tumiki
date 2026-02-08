"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { useAgentFlow } from "@/atoms/agentFlowAtoms";
import { StepIndicator } from "./StepIndicator";
import { Step1BasicInfo } from "./Step1BasicInfo";
import { Step2McpSelect } from "./Step2McpSelect";
import { Step3Review } from "./Step3Review";

type CreateAgentPageClientProps = {
  orgSlug: string;
};

// ステップ定義
const STEPS = [
  { number: 1, label: "基本情報" },
  { number: 2, label: "MCP選択" },
  { number: 3, label: "確認" },
];

/**
 * エージェント作成ページのクライアントコンポーネント
 * 3ステップウィザード形式
 */
export const CreateAgentPageClient = ({
  orgSlug,
}: CreateAgentPageClientProps) => {
  const router = useRouter();
  const { flowState, resetFlowState } = useAgentFlow();

  // ページ離脱時にフロー状態をリセット
  // resetFlowStateはuseCallbackでメモ化されているため、依存配列に含めても安全
  useEffect(() => {
    return () => {
      resetFlowState();
    };
  }, [resetFlowState]);

  const handleSuccess = (agentId: string) => {
    router.push(`/${orgSlug}/agents/${agentId}`);
  };

  const renderStep = () => {
    switch (flowState.currentStep) {
      case 1:
        return <Step1BasicInfo />;
      case 2:
        return <Step2McpSelect />;
      case 3:
        return <Step3Review onSuccess={handleSuccess} />;
      default:
        return <Step1BasicInfo />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/${orgSlug}/agents`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            エージェント一覧に戻る
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold">エージェントを作成</h1>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          システムプロンプトとMCPサーバーを組み合わせて、カスタムAIエージェントを構築します
        </p>
      </div>

      {/* ステップインジケーター */}
      <StepIndicator steps={STEPS} currentStep={flowState.currentStep} />

      {/* ステップコンテンツ */}
      <div className="mt-8">{renderStep()}</div>
    </div>
  );
};
