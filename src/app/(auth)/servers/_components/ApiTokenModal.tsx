"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

// サービス情報の取得関数
const getServiceInfo = (serviceId: string) => {
  const services = {
    slack: {
      name: "Slack",
      icon: "/logos/slack.svg",
      tokenUrl: "https://api.slack.com/apps",
      tokenInstructions:
        "Slack APIのページで新しいアプリを作成し、Bot User OAuth Tokenを生成してください。",
    },
    notion: {
      name: "Notion",
      icon: "/logos/notion.svg",
      tokenUrl: "https://www.notion.so/my-integrations",
      tokenInstructions:
        "Notionのインテグレーション設定から新しいインテグレーションを作成し、内部インテグレーショントークンを取得してください。",
    },
    playwright: {
      name: "Playwright",
      icon: "/logos/playwright.svg",
      tokenUrl: "https://playwright.dev/docs/auth",
      tokenInstructions:
        "Playwrightの認証設定から必要な認証情報を取得してください。",
    },
    github: {
      name: "GitHub",
      icon: "/logos/github.svg",
      tokenUrl: "https://github.com/settings/tokens",
      tokenInstructions:
        "GitHubの設定から「Developer settings」→「Personal access tokens」で新しいトークンを生成してください。",
    },
  };

  return (
    services[serviceId as keyof typeof services] ?? {
      name: "Unknown Service",
      icon: "/logos/default.png",
      tokenUrl: "#",
      tokenInstructions:
        "サービスプロバイダーのウェブサイトでAPIトークンを取得してください。",
    }
  );
};

// アイコンを表示する関数
const getIcon = (iconPath: string) => {
  return (
    <Image
      src={iconPath}
      alt="Service Icon"
      width={24}
      height={24}
      className="h-6 w-6"
    />
  );
};

type ApiTokenModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  onSave: (token: string, expiryDate: string) => void;
};

export function ApiTokenModal({
  open,
  onOpenChange,
  serviceId,
  onSave,
}: ApiTokenModalProps) {
  const [token, setToken] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [expiryDate, setExpiryDate] = useState("");
  const serviceInfo = getServiceInfo(serviceId);

  const handleSave = () => {
    onSave(token, expiryDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            APIトークンの設定
          </DialogTitle>
        </DialogHeader>

        {/* サービス情報 */}
        <div className="mb-6 flex items-center">
          <div className="mr-3 rounded-md p-3">{getIcon(serviceInfo.icon)}</div>
          <h2 className="text-xl font-semibold">{serviceInfo.name}</h2>
        </div>

        {/* APIトークン取得手順 */}
        <Card className="mb-6">
          <CardContent>
            <h3 className="mb-4 text-lg font-medium">APIトークンの取得方法</h3>

            <div className="space-y-4">
              <div className="flex">
                <div className="bg-primary text-primary-foreground mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                  1
                </div>
                <div>
                  <p className="font-medium">APIトークン発行ページにアクセス</p>
                  <a
                    href={serviceInfo.tokenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary mt-1 inline-flex items-center"
                  >
                    {serviceInfo.name}のAPIトークンページへ
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="flex">
                <div className="bg-primary text-primary-foreground mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                  2
                </div>
                <div>
                  <p className="font-medium">トークンの生成</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {serviceInfo.tokenInstructions}
                  </p>
                </div>
              </div>

              <div className="flex">
                <div className="bg-primary text-primary-foreground mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                  3
                </div>
                <div>
                  <p className="font-medium">トークンの保存</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    生成されたトークンを下のフォームに入力し、「保存」ボタンをクリックしてください。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* トークン入力フォーム */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">APIトークン</Label>
            <Input
              id="token"
              type="password"
              placeholder="APIトークンを入力してください"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          <Separator className="my-4" />

          <Button onClick={handleSave} className="w-full">
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
