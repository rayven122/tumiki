"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Users, ArrowRight, CheckCircle } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrganizationCreateForm } from "./OrganizationCreateForm";
import { toast } from "@/utils/client/toast";
import { WelcomeLoadingOverlay } from "./WelcomeLoadingOverlay";
import { useSession } from "next-auth/react";

type OnboardingClientProps = {
  isFirstLogin: boolean;
};

export const OnboardingClient = ({ isFirstLogin }: OnboardingClientProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedOption, setSelectedOption] = useState<
    "personal" | "team" | null
  >(null);
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);

  const handlePersonalUse = () => {
    setSelectedOption("personal");

    // セッションから組織情報を取得（個人組織は会員登録時に自動作成済み）
    const orgSlug = session?.user?.organizationSlug;
    if (orgSlug) {
      if (isFirstLogin) {
        setShowWelcomeOverlay(true);
      } else {
        router.push(`/${orgSlug}/mcps`);
      }
    } else {
      // エラーケース: セッションに組織情報が存在しない
      console.error(
        "No organization found in session. This should not happen.",
      );
      toast.error(
        "組織情報の取得に失敗しました。サポートにお問い合わせください。",
      );
    }
  };

  // アニメーション完了後の遷移処理
  const handleAnimationComplete = () => {
    setShowWelcomeOverlay(false);

    // セッションから組織slugを取得してリダイレクト
    const orgSlug = session?.user?.organizationSlug;
    if (orgSlug) {
      router.push(`/${orgSlug}/mcps`);
    } else {
      router.push("/mcp");
    }
  };

  const handleTeamUse = () => {
    setSelectedOption("team");
    setIsOrgDialogOpen(true);
  };

  const handleOrganizationCreated = () => {
    setIsOrgDialogOpen(false);

    // チーム組織作成後はウェルカムオーバーレイを表示
    setShowWelcomeOverlay(true);
  };

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center py-10">
      <div className="w-full max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">
            {isFirstLogin ? "Tumikiへようこそ！" : "新しい組織を作成"}
          </h1>
          <p className="text-muted-foreground text-xl">
            {isFirstLogin
              ? "MCPサーバー管理を始めるために、利用形態を選択してください"
              : "チーム利用のための新しい組織を作成します。利用形態を選択してください"}
          </p>
        </div>

        {/* オプション選択 */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* 個人利用オプション */}
          <Card
            className={clsx(
              "transition-all hover:shadow-lg",
              selectedOption === "personal" && "ring-primary ring-2",
              "cursor-pointer",
            )}
            onClick={handlePersonalUse}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">個人利用</CardTitle>
              <CardDescription className="text-base">
                一人でMCPサーバーを管理したい
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  簡単セットアップ
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  即座に利用開始
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  すべての機能を利用可能
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  後からチーム招待も可能
                </li>
              </ul>
              <Button
                className="mt-6 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  void handlePersonalUse();
                }}
              >
                {isFirstLogin ? "個人利用で開始" : "個人利用に戻る"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* チーム利用オプション */}
          <Card
            className={clsx(
              "transition-all hover:shadow-lg",
              selectedOption === "team" && "ring-primary ring-2",
              "cursor-pointer",
            )}
            onClick={handleTeamUse}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl">チーム利用</CardTitle>
              <CardDescription className="text-base">
                チームでMCPサーバーを共有管理したい
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  組織名とロゴを設定
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  メンバー招待機能
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  ロールベース権限管理
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  チーム用ダッシュボード
                </li>
              </ul>
              <Button
                className="mt-6 w-full"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTeamUse();
                }}
              >
                組織を作成
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ウェルカムローディングオーバーレイ */}
      <WelcomeLoadingOverlay
        isVisible={showWelcomeOverlay}
        onAnimationComplete={handleAnimationComplete}
      />

      {/* 組織作成ダイアログ */}
      <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新しい組織を作成</DialogTitle>
            <DialogDescription>
              チーム用の組織を作成します。組織名、説明、ロゴを設定してください。
            </DialogDescription>
          </DialogHeader>
          <OrganizationCreateForm onSuccess={handleOrganizationCreated} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
