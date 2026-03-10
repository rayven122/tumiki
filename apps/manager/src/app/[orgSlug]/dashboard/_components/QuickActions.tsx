"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import {
  Bot,
  Server,
  MessageSquare,
  ChevronRight,
  Zap,
  type LucideIcon,
} from "lucide-react";

type QuickActionsProps = {
  orgSlug: string;
};

type ActionDefinition = {
  pathSuffix: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

const ACTION_DEFINITIONS: ActionDefinition[] = [
  {
    pathSuffix: "/agents/new",
    label: "新規エージェント",
    icon: Bot,
    description: "AIエージェントを作成",
  },
  {
    pathSuffix: "/mcps/new",
    label: "新規MCPサーバー",
    icon: Server,
    description: "MCPサーバーを追加",
  },
  {
    pathSuffix: "/chat",
    label: "チャットを開始",
    icon: MessageSquare,
    description: "AIとチャット",
  },
];

type ActionCardProps = {
  action: ActionDefinition;
  orgSlug: string;
};

const ActionCard = ({ action, orgSlug }: ActionCardProps) => {
  const Icon = action.icon;

  return (
    <Link
      href={`/${orgSlug}${action.pathSuffix}`}
      className="hover:bg-accent group flex items-center gap-3 rounded-lg border p-3 transition-all duration-150"
    >
      <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
        <Icon className="text-foreground h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{action.label}</p>
        <p className="text-muted-foreground text-xs">{action.description}</p>
      </div>
      <ChevronRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  );
};

export const QuickActions = ({ orgSlug }: QuickActionsProps) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base">
        <Zap className="h-4 w-4" />
        クイックアクション
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 px-3 pb-3">
      {ACTION_DEFINITIONS.map((action) => (
        <ActionCard key={action.pathSuffix} action={action} orgSlug={orgSlug} />
      ))}
    </CardContent>
  </Card>
);
