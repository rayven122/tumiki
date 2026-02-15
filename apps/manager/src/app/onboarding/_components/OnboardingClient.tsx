"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Users, ArrowRight, CheckCircle, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrganizationCreateForm } from "./OrganizationCreateForm";
import { OnboardingFloatingBlocks } from "./OnboardingFloatingBlocks";
import { toast } from "@/lib/client/toast";
import { SuccessAnimation } from "@/app/_components/ui/SuccessAnimation";
import type { Session } from "next-auth";
import { getSessionInfo } from "~/lib/auth/session-utils";

// コーナーブロック装飾コンポーネント
type CornerBlocksProps = {
  colorClass: string;
};

const CornerBlocks = ({ colorClass }: CornerBlocksProps) => (
  <>
    <div
      className={`absolute -top-2 -left-2 h-4 w-4 border-2 border-black ${colorClass}`}
    />
    <div
      className={`absolute -top-2 -right-2 h-4 w-4 border-2 border-black ${colorClass}`}
    />
    <div
      className={`absolute -bottom-2 -left-2 h-4 w-4 border-2 border-black ${colorClass}`}
    />
    <div
      className={`absolute -right-2 -bottom-2 h-4 w-4 border-2 border-black ${colorClass}`}
    />
  </>
);

type OnboardingClientProps = {
  session: Session | null;
  isFirstLogin: boolean;
};

const ANIMATION_DURATION = 3000;

// 機能リストの定義
const personalFeatures = [
  "簡単セットアップ",
  "即座に利用開始",
  "すべての機能を利用可能",
  "後からチーム招待も可能",
];

const teamFeatures = [
  "チーム名とロゴを設定",
  "メンバー招待機能",
  "ロールベース権限管理",
  "チーム用ダッシュボード",
];

// アニメーション設定
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

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
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* フローティングブロック背景 */}
      <OnboardingFloatingBlocks />

      <div className="relative z-10 container mx-auto flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl">
          {/* ヘッダー */}
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="mb-4 text-3xl font-black tracking-tight text-black sm:text-4xl md:text-5xl">
              {isFirstLogin ? (
                <>
                  <span className="mr-2 inline-block -rotate-1 transform bg-black px-3 py-1 text-white shadow-[4px_4px_0_#6366f1]">
                    Tumiki
                  </span>
                  へようこそ！
                </>
              ) : (
                "新しいチームを作成"
              )}
            </h1>
            <motion.p
              className="text-lg font-medium text-gray-600 sm:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {isFirstLogin
                ? "MCPサーバー管理を始めるために、利用形態を選択してください"
                : "チーム利用のための新しいチームを作成します"}
            </motion.p>
          </motion.div>

          {/* オプション選択 */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* 個人利用オプション */}
            <motion.div
              className="group relative cursor-pointer border-3 border-black bg-white p-6 shadow-[6px_6px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0_#6366f1]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              onClick={handlePersonalUse}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <CornerBlocks colorClass="bg-indigo-500" />

              {/* アイコン */}
              <motion.div
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center border-3 border-black bg-gradient-to-br from-blue-50 to-indigo-100 shadow-[4px_4px_0_#000]"
                whileHover={{ scale: 1.05, rotate: 3 }}
              >
                <User className="h-10 w-10 text-blue-600" />
              </motion.div>

              <div className="text-center">
                <h2 className="mb-2 text-2xl font-black text-black">
                  個人利用
                </h2>
                <p className="mb-6 text-gray-600">
                  一人でMCPサーバーを管理したい
                </p>
              </div>

              {/* 機能リスト */}
              <motion.ul
                className="mb-6 space-y-3 text-sm"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {personalFeatures.map((feature, i) => (
                  <motion.li
                    key={i}
                    className="flex items-center gap-2"
                    variants={itemVariants}
                  >
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-gray-700">{feature}</span>
                  </motion.li>
                ))}
              </motion.ul>

              <Button
                className="w-full border-2 border-black bg-black text-white shadow-[4px_4px_0_#6366f1] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:bg-black hover:shadow-[6px_6px_0_#6366f1]"
                tabIndex={-1}
              >
                {isFirstLogin ? "個人利用で開始" : "個人利用に戻る"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

            {/* チーム利用オプション */}
            <motion.div
              className={`group relative border-3 border-black bg-white p-6 transition-all duration-300 ${
                isTeamUnlocked
                  ? "cursor-pointer shadow-[6px_6px_0_#9ca3af] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0_#9ca3af]"
                  : "cursor-not-allowed opacity-80 shadow-[6px_6px_0_#e5e7eb]"
              }`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              onClick={handleTeamUse}
              whileHover={isTeamUnlocked ? { scale: 1.02 } : {}}
              whileTap={isTeamUnlocked ? { scale: 0.98 } : {}}
            >
              <CornerBlocks
                colorClass={isTeamUnlocked ? "bg-purple-500" : "bg-gray-400"}
              />

              {/* ロックオーバーレイ */}
              {!isTeamUnlocked && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                  <motion.div
                    className="flex flex-col items-center gap-3 border-2 border-black bg-white px-6 py-4 shadow-[4px_4px_0_#000]"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut",
                    }}
                  >
                    <motion.div
                      animate={{
                        rotate: [0, -5, 5, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <Lock className="h-10 w-10 text-gray-500" />
                    </motion.div>
                    <div className="text-center">
                      <span className="inline-block bg-black px-2 py-0.5 text-xs font-bold text-white">
                        Coming Soon
                      </span>
                      <p className="mt-2 text-sm font-semibold text-gray-700">
                        ウェイティングリスト登録者限定
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        アーリーアクセスをお待ちください
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* アイコン */}
              <motion.div
                className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center border-3 border-black shadow-[4px_4px_0_#000] ${
                  isTeamUnlocked
                    ? "bg-gradient-to-br from-purple-50 to-indigo-100"
                    : "bg-gray-100 grayscale"
                }`}
                whileHover={isTeamUnlocked ? { scale: 1.05, rotate: -3 } : {}}
              >
                <Users
                  className={`h-10 w-10 ${isTeamUnlocked ? "text-purple-600" : "text-gray-400"}`}
                />
              </motion.div>

              <div className="text-center">
                <h2 className="mb-2 text-2xl font-black text-black">
                  チーム利用
                </h2>
                <p className="mb-6 text-gray-600">
                  チームでMCPサーバーを共有管理したい
                </p>
              </div>

              {/* 機能リスト */}
              <motion.ul
                className="mb-6 space-y-3 text-sm"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {teamFeatures.map((feature, i) => (
                  <motion.li
                    key={i}
                    className="flex items-center gap-2"
                    variants={itemVariants}
                  >
                    <CheckCircle
                      className={`h-5 w-5 flex-shrink-0 ${isTeamUnlocked ? "text-green-500" : "text-gray-400"}`}
                    />
                    <span
                      className={
                        isTeamUnlocked ? "text-gray-700" : "text-gray-500"
                      }
                    >
                      {feature}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>

              <Button
                className={`w-full border-2 border-black transition-all ${
                  isTeamUnlocked
                    ? "bg-white text-black shadow-[4px_4px_0_#9ca3af] hover:-translate-x-1 hover:-translate-y-1 hover:bg-white hover:shadow-[6px_6px_0_#9ca3af]"
                    : "cursor-not-allowed bg-gray-100 text-gray-400 shadow-[4px_4px_0_#e5e7eb]"
                }`}
                variant="outline"
                tabIndex={-1}
              >
                チームを作成
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
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
        <DialogContent className="max-w-2xl border-2 border-black shadow-[8px_8px_0_#6366f1]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              新しいチームを作成
            </DialogTitle>
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
