"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

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
import type { McpServer } from "@prisma/client";

// サービス情報の取得関数
// const getServiceInfo = (serviceId: string) => {
//   const services = {
//     slack: {
//       name: "Slack",
//       icon: "/logos/slack.svg",
//       tokenUrl: "https://api.slack.com/apps",
//       tokenInstructions:
//         "Slack APIのページで新しいアプリを作成し、Bot User OAuth Tokenを生成してください。",
//     },
//     notion: {
//       name: "Notion",
//       icon: "/logos/notion.svg",
//       tokenUrl: "https://www.notion.so/my-integrations",
//       tokenInstructions:
//         "Notionのインテグレーション設定から新しいインテグレーションを作成し、内部インテグレーショントークンを取得してください。",
//     },
//     playwright: {
//       name: "Playwright",
//       icon: "/logos/playwright.svg",
//       tokenUrl: "https://playwright.dev/docs/auth",
//       tokenInstructions:
//         "Playwrightの認証設定から必要な認証情報を取得してください。",
//     },
//     github: {
//       name: "GitHub",
//       icon: "/logos/github.svg",
//       tokenUrl: "https://github.com/settings/tokens",
//       tokenInstructions:
//         "GitHubの設定から「Developer settings」→「Personal access tokens」で新しいトークンを生成してください。",
//     },
//   };

//   return (
//     services[serviceId as keyof typeof services] ?? {
//       name: "Unknown Service",
//       icon: "/logos/default.png",
//       tokenUrl: "#",
//       tokenInstructions:
//         "サービスプロバイダーのウェブサイトでAPIトークンを取得してください。",
//     }
//   );
// };

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
  const [token, setToken] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            APIトークンの設定
          </DialogTitle>
          <DialogDescription>
            {mcpServer.name}に接続するためのAPIトークンを設定してください。
          </DialogDescription>
        </DialogHeader>

        {/* サービス情報 */}
        <div className="mb-4 flex items-center">
          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-md border p-2">
            <Image
              src={mcpServer.iconPath ?? "/placeholder.svg"}
              alt={mcpServer.name}
              width={24}
              height={24}
              className="h-6 w-6"
            />
          </div>
          <div>
            <h2 className="font-medium">{mcpServer.name}</h2>
            <Badge variant="outline" className="mt-1 text-xs">
              APIトークンが必要
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
                    // TODO: ツールの説明を追加
                    // href={mcpServer.tokenUrl}
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
                    {/* TODO: ツールの説明を追加 */}
                    Slack APIのページで新しいアプリを作成し、Bot User
                    OAuthTokenを生成してください。
                    {/* {serviceInfo.tokenInstructions} */}
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

        {/* トークン入力フォーム */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="token" className="text-sm">
              APIトークン
            </Label>
            <Input
              id="token"
              type="password"
              placeholder="APIトークンを入力してください"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="text-sm"
            />
            <p className="text-muted-foreground text-xs">
              トークンは暗号化されて安全に保存されます
            </p>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="sm"
            >
              キャンセル
            </Button>
            {/* eslint-disable-next-line @typescript-eslint/no-empty-function */}
            <Button onClick={() => {}} disabled={!token.trim()} size="sm">
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
