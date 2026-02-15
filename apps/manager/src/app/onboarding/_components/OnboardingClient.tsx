"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Users, ArrowRight, CheckCircle, Lock } from "lucide-react";
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
import { toast } from "@/lib/client/toast";
import { SuccessAnimation } from "@/app/_components/ui/SuccessAnimation";
import type { Session } from "next-auth";
import { getSessionInfo } from "~/lib/auth/session-utils";

type OnboardingClientProps = {
  session: Session | null;
  isFirstLogin: boolean;
};

const ANIMATION_DURATION = 3000;

export const OnboardingClient = ({
  session,
  isFirstLogin,
}: OnboardingClientProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedOption, setSelectedOption] = useState<
    "personal" | "team" | null
  >(null);
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // クエリパラメータからアンロックキーを取得
  const unlockKey = searchParams.get("unlock");
  const isTeamUnlocked = unlockKey === "early-access";

  const handlePersonalUse = () => {
    setSelectedOption("personal");

    // セッションからチーム情報を取得（個人チームは会員登録時に自動作成済み）
    const orgSlug = getSessionInfo(session).organizationSlug;
    if (orgSlug) {
      // 初回ログイン時はアニメーションを表示
      if (isFirstLogin) {
        setShowSuccessAnimation(true);

        // アニメーション後に遷移
        setTimeout(() => {
          router.push(`/${orgSlug}/mcps`);
        }, ANIMATION_DURATION);
      } else {
        router.push(`/${orgSlug}/mcps`);
      }
    } else {
      toast.error(
        "チーム情報の取得に失敗しました。3秒後に自動的に再読み込みします。",
      );

      // 3秒後に自動リロード（個人組織作成の遅延に対応）
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  };

  const handleTeamUse = () => {
    // ロックされている場合はトーストを表示して処理を中断
    if (!isTeamUnlocked) {
      toast.info(
        "チーム利用は現在ウェイティングリスト登録者限定の特典です。アーリーアクセスをお待ちください！",
      );
      return;
    }

    setSelectedOption("team");
    setIsOrgDialogOpen(true);
  };

  const handleOrganizationCreated = (newOrgSlug: string) => {
    setIsOrgDialogOpen(false);

    // チーム作成後はアニメーションを表示
    setShowSuccessAnimation(true);

    // アニメーション後に新しく作成した組織へ遷移
    setTimeout(() => {
      router.push(`/${newOrgSlug}/mcps`);
    }, ANIMATION_DURATION);
  };

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center py-10">
      <div className="w-full max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">
            {isFirstLogin ? "Tumikiへようこそ！" : "新しいチームを作成"}
          </h1>
          <p className="text-muted-foreground text-xl">
            {isFirstLogin
              ? "MCPサーバー管理を始めるために、利用形態を選択してください"
              : "チーム利用のための新しいチームを作成します。利用形態を選択してください"}
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
              <Button className="mt-6 w-full" tabIndex={-1} asChild>
                <span>
                  {isFirstLogin ? "個人利用で開始" : "個人利用に戻る"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Button>
            </CardContent>
          </Card>

          {/* チーム利用オプション */}
          <Card
            className={clsx(
              "relative transition-all",
              selectedOption === "team" && "ring-primary ring-2",
              isTeamUnlocked
                ? "cursor-pointer hover:shadow-lg"
                : "cursor-not-allowed",
            )}
            onClick={handleTeamUse}
          >
            {/* ロックオーバーレイ */}
            {!isTeamUnlocked && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/50">
                <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-2xl">
                  <Lock className="h-12 w-12 text-gray-400" strokeWidth={2} />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">
                      ウェイティングリスト登録者限定
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      アーリーアクセスをお待ちください
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                  チーム名とロゴを設定
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
                tabIndex={-1}
                asChild
              >
                <span
                  className={clsx(!isTeamUnlocked && "pointer-events-none")}
                >
                  チームを作成
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 成功アニメーションオーバーレイ */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <SuccessAnimation
            title={
              selectedOption === "team" ? "チーム作成完了！" : "準備完了！"
            }
            description={
              selectedOption === "team"
                ? "チームの準備が整いました"
                : "Tumikiの利用を開始します"
            }
          />
        </div>
      )}

      {/* チーム作成ダイアログ */}
      <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新しいチームを作成</DialogTitle>
            <DialogDescription>
              新しいチームを作成します。チーム名、説明、ロゴを設定してください。
            </DialogDescription>
          </DialogHeader>
          <OrganizationCreateForm onSuccess={handleOrganizationCreated} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
