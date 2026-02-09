"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { AgentId } from "@/schema/ids";

type RunningExecutionsProps = {
  agentId: AgentId;
};

const PulseIndicator = () => (
  <span className="relative flex h-3 w-3">
    <span className="absolute h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
    <span className="relative h-3 w-3 rounded-full bg-green-500" />
  </span>
);

export const RunningExecutions = ({ agentId }: RunningExecutionsProps) => {
  const { data: running } = api.v2.agentExecution.getRunning.useQuery(
    { agentId },
    { refetchInterval: 5000 },
  );

  if (!running?.length) {
    return null;
  }

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PulseIndicator />
          稼働中
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {running.map((exec) => (
          <div
            key={exec.id}
            className="flex items-center gap-3 rounded-lg bg-green-50 p-3"
          >
            <div className="flex-1">
              <div>
                <span className="font-medium text-green-700">
                  {exec.scheduleName ?? "手動実行"}
                </span>
                <span className="ml-2 text-sm text-gray-500">実行中...</span>
              </div>
              {exec.modelId && (
                <span className="text-xs text-gray-400">{exec.modelId}</span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              開始:{" "}
              {formatDistanceToNow(new Date(exec.createdAt), {
                addSuffix: true,
                locale: ja,
              })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
