"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import {
  User,
  Camera,
  Calendar,
  MapPin,
  Link2,
  Info,
  Shield,
  Construction,
} from "lucide-react";
import Image from "next/image";
import { guestRegex } from "@/lib/constants";
import { useMemo } from "react";

const ProfilePage = () => {
  const { data: session } = useSession();
  const user = session?.user;

  const isGuest = useMemo(() => {
    return guestRegex.test(user?.email ?? "");
  }, [user?.email]);

  // Auth.jsではcreatedAt情報は直接取得できないため"不明"を表示
  const createdAt = "不明";

  return (
    <div className="relative container mx-auto space-y-6 py-6">
      {/* 背景UI */}
      <div className="opacity-90">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <User className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">プロフィール</h1>
              <p className="text-muted-foreground">アカウント情報と個人設定</p>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Info className="h-3 w-3" />
            <span>開発中</span>
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* プロフィール概要 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>プロフィール写真</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  {user?.image ? (
                    <Image
                      src={user.image}
                      alt={user.name ?? "プロフィール画像"}
                      width={120}
                      height={120}
                      className="border-border rounded-full border-4"
                    />
                  ) : (
                    <div className="bg-primary text-primary-foreground border-border flex h-[120px] w-[120px] items-center justify-center rounded-full border-4 text-4xl font-bold">
                      {isGuest ? "G" : (user?.email?.[0]?.toUpperCase() ?? "U")}
                    </div>
                  )}

                  <div className="space-y-1 text-center">
                    <h3 className="text-lg font-semibold">
                      {isGuest
                        ? "ゲストユーザー"
                        : (user?.name ?? "名前未設定")}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {user?.email}
                    </p>
                    {isGuest && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="mr-1 h-3 w-3" />
                        ゲストアカウント
                      </Badge>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                    disabled
                  >
                    <Camera className="h-4 w-4" />
                    <span>写真を変更</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* アカウント情報 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>アカウント情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">登録日:</span>
                  <span>{createdAt}</span>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <Shield className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">アカウント種別:</span>
                  <span>{isGuest ? "ゲスト" : "標準"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* プロフィール詳細 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>基本情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">名</Label>
                    <Input id="firstName" placeholder="名を入力" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">姓</Label>
                    <Input id="lastName" placeholder="姓を入力" disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">表示名</Label>
                  <Input
                    id="displayName"
                    value={user?.name ?? ""}
                    placeholder="表示名を入力"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="bio">自己紹介</Label>
                  <Textarea
                    id="bio"
                    placeholder="自己紹介を入力してください..."
                    className="min-h-[100px]"
                    disabled
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="location">所在地</Label>
                    <div className="flex items-center space-x-2">
                      <MapPin className="text-muted-foreground h-4 w-4" />
                      <Input
                        id="location"
                        placeholder="例: 東京, 日本"
                        disabled
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">ウェブサイト</Label>
                    <div className="flex items-center space-x-2">
                      <Link2 className="text-muted-foreground h-4 w-4" />
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://example.com"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* プライバシー設定 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>プライバシー設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        プロフィール公開
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        他のユーザーがあなたのプロフィールを閲覧できます
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      近日公開
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        アクティビティ表示
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        最終ログイン時刻を他のユーザーに表示
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      近日公開
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
                  プロフィール機能は現在開発中です。編集機能やプライバシー設定は今後のアップデートで利用可能になります。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" disabled>
            キャンセル
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
                  <User className="h-6 w-6" />
                  <span>プロフィール</span>
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

export default ProfilePage;
