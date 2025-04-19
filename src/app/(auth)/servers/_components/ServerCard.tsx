"use client";

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Database,
  Edit,
  MoreVertical,
  Network,
  Play,
  RotateCw,
  Server,
  ServerCog,
  ServerOff,
  Square,
  Trash2,
} from "lucide-react";

type ServerType = {
  id: string;
  name: string;
  status: "running" | "stopped";
  lastUpdated: string;
  icon: string;
};

type ServerCardProps = {
  server: ServerType;
  onStatusChange: (id: string, action: "start" | "stop" | "restart") => void;
  onDelete: (id: string) => void;
};

export function ServerCard({
  server,
  onStatusChange,
  onDelete,
}: ServerCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // アイコンを選択する関数
  const getIcon = () => {
    switch (server.icon) {
      case "server":
        return <Server className="h-6 w-6" />;
      case "server-cog":
        return <ServerCog className="h-6 w-6" />;
      case "server-off":
        return <ServerOff className="h-6 w-6" />;
      case "database":
        return <Database className="h-6 w-6" />;
      case "network":
        return <Network className="h-6 w-6" />;
      default:
        return <Server className="h-6 w-6" />;
    }
  };

  // 最終更新日時をフォーマットする
  const formattedLastUpdated = formatDistanceToNow(
    new Date(server.lastUpdated),
    {
      addSuffix: true,
      locale: ja,
    },
  );

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <h3 className="font-medium">{server.name}</h3>
          </div>
          <Badge
            variant={server.status === "running" ? "default" : "secondary"}
          >
            {server.status === "running" ? "起動中" : "停止中"}
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-muted-foreground text-sm">
            最終更新: {formattedLastUpdated}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="icon"
              disabled={server.status === "running"}
              onClick={() => onStatusChange(server.id, "start")}
              title="起動"
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={server.status === "stopped"}
              onClick={() => onStatusChange(server.id, "stop")}
              title="停止"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onStatusChange(server.id, "restart")}
              title="再起動"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                編集
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>サーバーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{server.name}」を削除します。この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(server.id)}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
