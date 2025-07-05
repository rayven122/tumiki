"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Server } from "lucide-react";

type AddRemoteServerCardProps = {
  onConnect: () => void;
};

export const AddRemoteServerCard = ({
  onConnect,
}: AddRemoteServerCardProps) => {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="mr-2 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 p-2">
          <div className="flex h-8 w-8 items-center justify-center">
            <Server className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <CardTitle>リモートMCPサーバー</CardTitle>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-green-200 bg-green-50 text-green-700"
            >
              <Plus className="mr-1 h-3 w-3" />
              新規作成
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {/* 機能説明ボタン */}
        <Button
          variant="outline"
          size="sm"
          className="mb-2 flex w-full items-center justify-between"
          onClick={onConnect}
        >
          <span className="flex items-center">
            <Server className="mr-2 size-4" />
            リモートMCPサーバーを追加
          </span>
          <Badge variant="secondary" className="ml-2">
            SSE / Streamable HTTPS
          </Badge>
        </Button>

        {/* <div className="border-muted-foreground/25 rounded-lg border-2 border-dashed p-3 text-center">
          <ImageIcon className="text-muted-foreground/50 mx-auto h-8 w-8" />
          <p className="text-muted-foreground mt-2 text-sm">
            独自のMCPサーバーを作成して
            <br />
            他のユーザーと共有できます
          </p>
        </div> */}
      </CardContent>

      <CardFooter className="mt-auto">
        <Button type="button" onClick={onConnect} className="w-full">
          接続
        </Button>
      </CardFooter>
    </Card>
  );
};
