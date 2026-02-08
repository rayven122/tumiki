"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Calendar, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { ScheduleList } from "./ScheduleList";
import { ScheduleForm } from "./ScheduleForm";
import { ExecutionHistory } from "./ExecutionHistory";
import type { AgentId } from "@/schema/ids";

type SchedulePageClientProps = {
  agentId: string;
};

export const SchedulePageClient = ({ agentId }: SchedulePageClientProps) => {
  const router = useRouter();
  const params = useParams<{ orgSlug: string }>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // エージェント情報を取得
  const { data: agent, isLoading: isAgentLoading } =
    api.v2.agent.findById.useQuery({
      id: agentId as AgentId,
    });

  if (isAgentLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">エージェントが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${params.orgSlug}/agents/${agentId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-sm text-gray-500">スケジュール設定</p>
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規スケジュール
        </Button>
      </div>

      {/* スケジュール一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            スケジュール一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduleList agentId={agentId as AgentId} />
        </CardContent>
      </Card>

      {/* 実行履歴 */}
      <Card>
        <CardHeader>
          <CardTitle>実行履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <ExecutionHistory agentId={agentId as AgentId} />
        </CardContent>
      </Card>

      {/* 作成フォーム */}
      <ScheduleForm
        agentId={agentId as AgentId}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </div>
  );
};
