"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// アクション定義の型（href以外の静的プロパティ）
type ActionDefinition = {
  key: string;
  pathSuffix: string;
  label: string;
  icon: LucideIcon;
  description: string;
  iconBgClass: string;
  iconClass: string;
};

// アクション定義（コンポーネント外で定義して再レンダリング時の再作成を防止）
const ACTION_DEFINITIONS: ActionDefinition[] = [
  {
    key: "new-agent",
    pathSuffix: "/agents/new",
    label: "新規エージェント",
    icon: Bot,
    description: "AIエージェントを作成",
    iconBgClass: "bg-purple-100",
    iconClass: "text-purple-600",
  },
  {
    key: "new-mcp",
    pathSuffix: "/mcps/new",
    label: "新規MCPサーバー",
    icon: Server,
    description: "MCPサーバーを追加",
    iconBgClass: "bg-blue-100",
    iconClass: "text-blue-600",
  },
  {
    key: "chat",
    pathSuffix: "/chat",
    label: "チャットを開始",
    icon: MessageSquare,
    description: "AIとチャット",
    iconBgClass: "bg-green-100",
    iconClass: "text-green-600",
  },
];

// アクションカードコンポーネント
type ActionCardProps = {
  action: ActionDefinition;
  orgSlug: string;
};

const ActionCard = ({ action, orgSlug }: ActionCardProps) => {
  const Icon = action.icon;
  const href = `/${orgSlug}${action.pathSuffix}`;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-all duration-150 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-sm"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${action.iconBgClass}`}
      >
        <Icon className={`h-5 w-5 ${action.iconClass}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{action.label}</p>
        <p className="text-muted-foreground text-xs">{action.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-gray-600" />
    </Link>
  );
};

export const QuickActions = ({ orgSlug }: QuickActionsProps) => (
  <Card className="border-0 shadow-md">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base">
        <Zap className="h-4 w-4" />
        クイックアクション
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 px-3 pb-3">
      {ACTION_DEFINITIONS.map((action) => (
        <ActionCard key={action.key} action={action} orgSlug={orgSlug} />
      ))}
    </CardContent>
  </Card>
);
