"use client";

import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
import { Button } from "@tumiki/ui/button";

import { CreateAgentForm } from "./CreateAgentForm";

type CreateAgentPageClientProps = {
  orgSlug: string;
};

/**
 * エージェント作成ページのクライアントコンポーネント
 */
export const CreateAgentPageClient = ({
  orgSlug,
}: CreateAgentPageClientProps) => {
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

      {/* フォーム */}
      <CreateAgentForm orgSlug={orgSlug} />
    </div>
  );
};
