"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Users, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
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
import { OrganizationCreateForm } from "./_components/OrganizationCreateForm";
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";
import { WelcomeLoadingOverlay } from "./_components/WelcomeLoadingOverlay";

const OnboardingPage = () => {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<
    "personal" | "team" | null
  >(null);
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);

  // オンボーディング状況をチェック
  const { data: onboardingStatus } = api.user.checkOnboardingStatus.useQuery();
  const isFirstLogin =
    onboardingStatus && !onboardingStatus.isOnboardingCompleted;

  const utils = api.useUtils();

  // オンボーディング完了ミューテーション
  const completeOnboarding = api.user.completeOnboarding.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.user.checkOnboardingStatus.invalidate(),
        utils.organization.getUserOrganizations.invalidate(),
      ]);
      toast.success("アカウント設定が完了しました！");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePersonalUse = async () => {
    setSelectedOption("personal");

    // 初回ログイン時はオンボーディング完了をマーク
    if (isFirstLogin) {
      setShowWelcomeOverlay(true);
      await completeOnboarding.mutateAsync();
    } else {
      // 初回ログインでない場合は直接遷移
      router.push("/mcp");
    }
  };

  // アニメーション完了後の遷移処理
  const handleAnimationComplete = () => {
    setShowWelcomeOverlay(false);
    router.push("/mcp");
  };

  const handleTeamUse = () => {
    setSelectedOption("team");
    setIsOrgDialogOpen(true);
  };

  const handleOrganizationCreated = async () => {
    setIsOrgDialogOpen(false);

    // 初回ログイン時はオンボーディング完了をマーク
    if (isFirstLogin) {
      await completeOnboarding.mutateAsync();
    }

    // 組織作成後はウェルカムオーバーレイを表示
    // その後、MCPダッシュボードに遷移
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
              completeOnboarding.isPending
                ? "cursor-not-allowed opacity-70"
                : "cursor-pointer",
            )}
            onClick={
              completeOnboarding.isPending ? undefined : handlePersonalUse
            }
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
                disabled={completeOnboarding.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  void handlePersonalUse();
                }}
              >
                {completeOnboarding.isPending &&
                selectedOption === "personal" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    設定中...
                  </>
                ) : (
                  <>
                    {isFirstLogin ? "個人利用で開始" : "個人利用に戻る"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* チーム利用オプション */}
          <Card
            className={clsx(
              "transition-all hover:shadow-lg",
              selectedOption === "team" && "ring-primary ring-2",
              completeOnboarding.isPending
                ? "cursor-not-allowed opacity-70"
                : "cursor-pointer",
            )}
            onClick={completeOnboarding.isPending ? undefined : handleTeamUse}
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
                disabled={completeOnboarding.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTeamUse();
                }}
              >
                {completeOnboarding.isPending && selectedOption === "team" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    設定中...
                  </>
                ) : (
                  <>
                    組織を作成
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
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

export default OnboardingPage;
