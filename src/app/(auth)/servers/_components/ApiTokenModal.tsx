"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-toastify";
import type { McpServer } from "@prisma/client";

type ApiTokenModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mcpServer: McpServer;
};

export const ApiTokenModal = ({
  open,
  onOpenChange,
  mcpServer,
}: ApiTokenModalProps) => {
  const [isPending, startTransition] = useTransition();

  // 各環境変数に対応するトークンを保持するステート
  const [tokens, setTokens] = useState<Record<string, string>>(() => {
    // envVarsの各項目に対して空の文字列を初期値として設定
    return mcpServer.envVars.reduce((acc, envVar) => {
      return { ...acc, [envVar]: "" };
    }, {});
  });

  // 特定の環境変数のトークン値を更新する関数
  const handleTokenChange = (envVar: string, value: string) => {
    setTokens((prev) => ({
      ...prev,
      [envVar]: value,
    }));
  };

  // すべてのトークンが入力されているかチェック
  const isFormValid = () => {
    return Object.values(tokens).every((token) => token.trim() !== "");
  };

  // トークンを保存する関数
  const handleSave = async () => {
    startTransition(async () => {
      // APIトークン保存のシミュレーション
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 成功時のトースト表示
      toast.success(`${mcpServer.name}のAPIトークンが正常に保存されました。`);

      console.log("保存されたトークン:", tokens);
      onOpenChange(false);

      // エラー時のトースト表示
      // toast({
      //   title: "エラーが発生しました",
      //   description: "APIトークンの保存中にエラーが発生しました。もう一度お試しください。",
      //   variant: "destructive",
      // })
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            APIトークンの設定
          </DialogTitle>
          <DialogDescription>
            {mcpServer.name}
            に接続するために必要なAPIトークンを設定してください。
          </DialogDescription>
        </DialogHeader>

        {/* サービス情報 */}
        <div className="mb-4 flex items-center">
          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-md border p-2">
            <Image
              src={mcpServer.iconPath ?? "/placeholder.svg?height=24&width=24"}
              alt={mcpServer.name}
              width={24}
              height={24}
              className="h-6 w-6"
            />
          </div>
          <div>
            <h2 className="font-medium">{mcpServer.name}</h2>
            <Badge variant="outline" className="mt-1 text-xs">
              {mcpServer.envVars.length > 1
                ? `${mcpServer.envVars.length}つのAPIトークンが必要`
                : "APIトークンが必要"}
            </Badge>
          </div>
        </div>

        {/* APIトークン取得手順 */}
        <Card className="mb-4 border">
          <CardContent className="p-4">
            <h3 className="mb-3 font-medium">APIトークンの取得方法</h3>

            <div className="space-y-3 text-sm">
              <div className="flex">
                <div className="bg-primary text-primary-foreground mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs">
                  1
                </div>
                <div>
                  <p className="font-medium">APIトークン発行ページにアクセス</p>
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary mt-1 inline-flex items-center text-xs"
                  >
                    {mcpServer.name}のAPIトークンページへ
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="flex">
                <div className="bg-primary text-primary-foreground mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs">
                  2
                </div>
                <div>
                  <p className="font-medium">トークンの生成</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    必要なAPIトークンを生成してください。
                  </p>
                </div>
              </div>

              <div className="flex">
                <div className="bg-primary text-primary-foreground mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs">
                  3
                </div>
                <div>
                  <p className="font-medium">トークンの保存</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    生成されたトークンを下のフォームに入力し、「保存」ボタンをクリックしてください。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 動的に生成されるトークン入力フォーム */}
        <div className="space-y-4">
          {mcpServer.envVars.map((envVar, index) => (
            <div key={envVar} className="space-y-2">
              <Label htmlFor={`token-${envVar}`} className="text-sm">
                {envVar}
              </Label>
              <Input
                id={`token-${envVar}`}
                type="password"
                placeholder={`${envVar}を入力してください`}
                value={tokens[envVar]}
                onChange={(e) => handleTokenChange(envVar, e.target.value)}
                className="text-sm"
              />
              {index === mcpServer.envVars.length - 1 && (
                <p className="text-muted-foreground text-xs">
                  トークンは暗号化されて安全に保存されます
                </p>
              )}
            </div>
          ))}

          <Separator className="my-4" />

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="sm"
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isFormValid() || isPending}
              size="sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
