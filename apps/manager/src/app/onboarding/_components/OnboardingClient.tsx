"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Users, ArrowRight, CheckCircle, Lock } from "lucide-react";
import { clsx } from "clsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrganizationCreateForm } from "./OrganizationCreateForm";
import { toast } from "@/utils/client/toast";
import { SuccessAnimation } from "@/app/_components/ui/SuccessAnimation";
import type { Session } from "next-auth";
import { getSessionInfo } from "~/lib/auth/session-utils";
import {
  PageContainer,
  GradientTitle,
  IconWithGlow,
  NeoBrutalismButton,
} from "@/components/ui/neo-brutalism";

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

  const handleOrganizationCreated = () => {
    setIsOrgDialogOpen(false);

    // チーム作成後はアニメーションを表示
    setShowSuccessAnimation(true);

    // アニメーション後に遷移
    const orgSlug = getSessionInfo(session).organizationSlug;
    setTimeout(() => {
      // ページをリロードして新しい組織情報を取得
      if (orgSlug) {
        router.push(`/${orgSlug}/mcps`);
      } else {
        window.location.reload();
      }
    }, ANIMATION_DURATION);
  };

  return (
    <PageContainer>
      <div className="w-full max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-12 text-center">
          <GradientTitle className="mb-4 text-4xl">
            {isFirstLogin ? "Tumikiへようこそ！" : "新しいチームを作成"}
          </GradientTitle>
          <p className="text-xl font-medium text-gray-600">
            {isFirstLogin
              ? "MCPサーバー管理を始めるために、利用形態を選択してください"
              : "チーム利用のための新しいチームを作成します。利用形態を選択してください"}
          </p>
        </div>

        {/* オプション選択 */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* 個人利用オプション */}
          <div
            className={clsx(
              "group relative cursor-pointer overflow-hidden border-2 border-black bg-white p-8 shadow-(--shadow-hard) transition-all duration-200 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-(--shadow-hard-sm)",
              selectedOption === "personal" &&
                "ring-4 ring-indigo-500 ring-offset-2",
            )}
            onClick={handlePersonalUse}
          >
            {/* グラデーションオーバーレイ */}
            <div className="absolute inset-0 bg-linear-to-br from-indigo-50 to-blue-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"></div>

            <div className="relative text-center">
              <IconWithGlow
                icon={<User className="h-8 w-8 text-indigo-600" />}
                bgColor="bg-indigo-100"
                glowFrom="from-indigo-400"
                glowTo="to-blue-400"
                className="mx-auto mb-6"
              />
              <h2 className="mb-2 text-2xl font-bold text-gray-900">
                個人利用
              </h2>
              <p className="mb-6 text-base text-gray-600">
                一人でMCPサーバーを管理したい
              </p>
            </div>
            <ul className="relative mb-6 space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                簡単セットアップ
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                即座に利用開始
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                すべての機能を利用可能
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                後からチーム招待も可能
              </li>
            </ul>
            <NeoBrutalismButton color="indigo">
              {isFirstLogin ? "個人利用で開始" : "個人利用に戻る"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </NeoBrutalismButton>
          </div>

          {/* チーム利用オプション */}
          <div
            className={clsx(
              "group relative overflow-hidden border-2 border-black bg-white p-8 shadow-(--shadow-hard) transition-all duration-200",
              selectedOption === "team" &&
                "ring-4 ring-purple-500 ring-offset-2",
              isTeamUnlocked
                ? "cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-(--shadow-hard-sm)"
                : "cursor-not-allowed",
            )}
            onClick={handleTeamUse}
          >
            {/* グラデーションオーバーレイ */}
            {isTeamUnlocked && (
              <div className="absolute inset-0 bg-linear-to-br from-purple-50 to-pink-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"></div>
            )}

            {/* ロックオーバーレイ */}
            {!isTeamUnlocked && (
              <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
                <div className="relative">
                  <div className="absolute -inset-3 animate-pulse bg-linear-to-r from-gray-300 to-gray-400 opacity-20 blur-xl"></div>
                  <div className="relative flex flex-col items-center gap-3 border-2 border-black bg-white px-6 py-4 shadow-(--shadow-hard)">
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
              </div>
            )}

            <div className="relative text-center">
              <IconWithGlow
                icon={<Users className="h-8 w-8 text-purple-600" />}
                bgColor="bg-purple-100"
                glowFrom="from-purple-400"
                glowTo="to-pink-400"
                className="mx-auto mb-6"
              />
              <h2 className="mb-2 text-2xl font-bold text-gray-900">
                チーム利用
              </h2>
              <p className="mb-6 text-base text-gray-600">
                チームでMCPサーバーを共有管理したい
              </p>
            </div>
            <ul className="relative mb-6 space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                チーム名とロゴを設定
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                メンバー招待機能
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                ロールベース権限管理
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                チーム用ダッシュボード
              </li>
            </ul>
            <NeoBrutalismButton
              color={isTeamUnlocked ? "purple" : "gray"}
              disabled={!isTeamUnlocked}
            >
              チームを作成
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </NeoBrutalismButton>
          </div>
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
    </PageContainer>
  );
};
