"use client";

import { Button } from "@tumiki/ui/button";
import { Bot, Plus } from "lucide-react";
import Link from "next/link";

type EmptyStateProps = {
  isAdmin: boolean;
  orgSlug: string;
};

/**
 * エージェントが未作成時の空状態コンポーネント
 * 管理者には作成への誘導を、メンバーには管理者への依頼を促す
 */
export const EmptyState = ({ isAdmin, orgSlug }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
        <Bot className="h-8 w-8 text-purple-600" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        {isAdmin
          ? "AIエージェントを作成しましょう"
          : "エージェントがありません"}
      </h3>
      <p className="mb-6 max-w-md text-center text-sm text-gray-600">
        {isAdmin ? (
          <>
            システムプロンプトとMCPサーバーを組み合わせて、
            <br />
            カスタムAIエージェントを構築できます
          </>
        ) : (
          <>
            組織にエージェントが作成されていません。
            <br />
            管理者にエージェントの作成を依頼してください。
          </>
        )}
      </p>
      {isAdmin && (
        <Button asChild>
          <Link href={`/${orgSlug}/agents/create`}>
            <Plus className="mr-2 h-4 w-4" />
            エージェントを作成
          </Link>
        </Button>
      )}
    </div>
  );
};
