"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ExternalLink } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import { EntityIcon } from "@/components/ui/EntityIcon";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

type RunningAgent = RouterOutputs["agentExecution"]["getAllRunning"][number];

type RunningAgentsProps = {
  agents: RunningAgent[];
  orgSlug: string;
};

export const RunningAgents = ({ agents, orgSlug }: RunningAgentsProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="relative flex h-2 w-2">
            <span className="absolute h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-green-500" />
          </span>
          稼働中のエージェント
          <span className="text-muted-foreground text-sm font-normal">
            ({agents.length}件)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {agents.map((agent) => {
          // 推定進捗を計算
          const elapsed = Date.now() - new Date(agent.createdAt).getTime();
          const progress = Math.min(
            Math.round((elapsed / agent.estimatedDurationMs) * 100),
            95,
          );

          return (
            <Link
              key={agent.id}
              href={`/${orgSlug}/agents/${agent.agentSlug}`}
              className="hover:bg-muted/50 block rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* アイコン */}
                <EntityIcon
                  iconPath={agent.agentIconPath}
                  type="agent"
                  size="sm"
                  alt={agent.agentName}
                />

                {/* 情報 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{agent.agentName}</p>
                    <ExternalLink className="text-muted-foreground h-3 w-3 shrink-0" />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(agent.createdAt), {
                      addSuffix: true,
                      locale: ja,
                    })}
                    に開始
                  </p>

                  {/* プログレスバー */}
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={progress} className="h-1.5 flex-1" />
                    <span className="text-muted-foreground text-xs">
                      {progress}%
                    </span>
                  </div>

                  {/* 最新メッセージ */}
                  {agent.latestMessage && (
                    <p className="text-muted-foreground mt-1 truncate text-xs">
                      {agent.latestMessage}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
};
