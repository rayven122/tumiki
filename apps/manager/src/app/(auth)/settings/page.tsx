"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import {
  Settings,
  Bell,
  Lock,
  Palette,
  Globe,
  Info,
  Construction,
} from "lucide-react";

const SettingsPage = () => {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="relative container mx-auto space-y-6 py-6">
      {/* 背景UI */}
      <div className="opacity-90">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">設定</h1>
              <p className="text-muted-foreground">
                アカウントと環境設定を管理
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Info className="h-3 w-3" />
            <span>開発中</span>
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* アカウント設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>アカウント設定</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email ?? ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-muted-foreground text-xs">
                  メールアドレスはAuth0で管理されています
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">表示名</Label>
                <Input
                  id="name"
                  type="text"
                  value={user?.name ?? ""}
                  placeholder="表示名を入力"
                  disabled
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">セキュリティ</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">二段階認証</Label>
                    <p className="text-muted-foreground text-xs">
                      追加のセキュリティレイヤー
                    </p>
                  </div>
                  <Switch disabled />
                </div>

                <Button variant="outline" size="sm" disabled>
                  パスワードを変更
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 通知設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>通知設定</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">メール通知</Label>
                  <p className="text-muted-foreground text-xs">
                    重要な更新をメールで受信
                  </p>
                </div>
                <Switch defaultChecked disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">MCPサーバー通知</Label>
                  <p className="text-muted-foreground text-xs">
                    サーバーの状態変更通知
                  </p>
                </div>
                <Switch defaultChecked disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">システム通知</Label>
                  <p className="text-muted-foreground text-xs">
                    メンテナンスやアップデート情報
                  </p>
                </div>
                <Switch disabled />
              </div>
            </CardContent>
          </Card>

          {/* 外観設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>外観設定</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>テーマ</Label>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    ライト
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    ダーク
                  </Button>
                  <Button variant="default" size="sm" disabled>
                    システム
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>言語</Label>
                <div className="flex space-x-2">
                  <Button variant="default" size="sm" disabled>
                    日本語
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    English
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 地域設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>地域設定</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>タイムゾーン</Label>
                <Input value="Asia/Tokyo (JST)" disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label>日付形式</Label>
                <div className="flex space-x-2">
                  <Button variant="default" size="sm" disabled>
                    YYYY/MM/DD
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    MM/DD/YYYY
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 開発中の注意書き */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Info className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  開発中機能について
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  現在、多くの設定項目は開発中です。一部の機能は制限されている場合があります。
                  フィードバックや不具合の報告をお待ちしています。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" disabled>
            リセット
          </Button>
          <Button disabled>変更を保存</Button>
        </div>
      </div>

      {/* 開発中オーバーレイ（ヘッダーを除く） */}
      <div className="fixed top-[60px] right-0 bottom-0 left-0 z-50 flex items-center justify-center bg-black/10">
        <Card className="mx-4 w-full max-w-md">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="rounded-full bg-orange-100 p-4 dark:bg-orange-900">
                <Construction className="h-12 w-12 text-orange-600 dark:text-orange-400" />
              </div>

              <div className="space-y-2">
                <h1 className="flex items-center space-x-2 text-2xl font-bold">
                  <Settings className="h-6 w-6" />
                  <span>設定</span>
                </h1>
                <p className="text-muted-foreground text-lg font-medium">
                  現在開発中です
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">
                  この機能は現在開発中のため、操作はできません。
                </p>
                <p className="text-muted-foreground text-sm">
                  今後のアップデートでご利用可能になる予定です。
                </p>
              </div>

              <div className="pt-4">
                <p className="text-muted-foreground text-xs">
                  ご不便をおかけして申し訳ございません。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
