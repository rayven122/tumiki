"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type WelcomeLoadingOverlayProps = {
  isVisible: boolean;
  onAnimationComplete?: () => void;
};

/**
 * Tumikiオンボーディング用のウェルカムローディングオーバーレイコンポーネント
 *
 * アニメーションタイムライン（合計3秒間最低保証）:
 * - 0-2秒: 「Tumikiへようこそ！」メッセージ表示
 * - 2-3秒: 「準備完了！」表示
 * - 3秒後: onAnimationComplete()コールバック実行
 *
 * 視覚効果:
 * - グラデーション背景のアニメーション（連続サイクル）
 * - 30個の浮遊パーティクル（Sparkles, Heart, Zap）
 * - メッセージのスライドイン/アウト効果
 * - ローディングドットのバウンスアニメーション
 * - 完了時の拡張パーティクルエフェクト
 *
 * @param isVisible - オーバーレイの表示状態
 * @param onAnimationComplete - アニメーション完了時のコールバック関数
 */

const welcomeMessages = [
  {
    icon: "🎉",
    title: "Tumikiへようこそ！",
    subtitle: "チーム向けAIをパーソナライズ",
  },
];

export const WelcomeLoadingOverlay = ({
  isVisible,
  onAnimationComplete,
}: WelcomeLoadingOverlayProps) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        if (prev < welcomeMessages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    const completeTimeout = setTimeout(() => {
      setIsCompleting(true);
      setTimeout(() => {
        onAnimationComplete?.();
      }, 1000);
    }, 2000);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(completeTimeout);
    };
  }, [isVisible, onAnimationComplete]);

  if (!isVisible) return null;

  const currentMessage = welcomeMessages[currentMessageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Clean white background with subtle pattern */}
      <div className="absolute inset-0 bg-white" />

      {/* Animated geometric blocks similar to hero section */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute border-2 border-gray-300 bg-gray-100 shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${30 + Math.random() * 40}px`,
              height: `${30 + Math.random() * 40}px`,
            }}
            animate={{
              y: [0, -20 + Math.random() * 40, 0],
              rotate: [0, -10 + Math.random() * 20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center">
        {isCompleting ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="mb-6 text-8xl"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              🎊
            </motion.div>
            <h2 className="mb-6 text-5xl font-black tracking-tight text-black">
              準備完了！
            </h2>
            <p className="mb-4 text-2xl font-medium text-gray-600">
              素晴らしいものを作りましょう
            </p>
            <div className="flex justify-center space-x-2">
              {[0, 1, 2, 3, 4].map((dot) => (
                <motion.div
                  key={dot}
                  className="h-3 w-3 border-2 border-black bg-black"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: dot * 0.1,
                  }}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            key={currentMessageIndex}
          >
            {/* Icon with animation */}
            <motion.div
              className="mb-8 text-9xl"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {currentMessage?.icon}
            </motion.div>

            {/* Tumiki logo with block design */}
            <div className="mb-10">
              <div className="inline-block -rotate-1 transform border-3 border-black bg-black px-8 py-4 shadow-[4px_4px_0_#6366f1]">
                <span className="text-3xl font-black text-white">Tumiki</span>
              </div>
            </div>

            {/* Message content */}
            <div className="space-y-6">
              <h2 className="mb-6 text-5xl font-black tracking-tight text-black">
                {currentMessage?.title}
              </h2>
              <p className="text-2xl font-medium text-gray-600">
                {currentMessage?.subtitle}
              </p>
            </div>

            {/* Loading blocks */}
            <div className="mt-10 flex justify-center">
              <div className="flex space-x-3">
                {[0, 1, 2, 3].map((dot) => (
                  <motion.div
                    key={dot}
                    className="h-4 w-4 border-2 border-black bg-black shadow-[2px_2px_0_rgba(0,0,0,0.2)]"
                    animate={{ y: [0, -10, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: dot * 0.15,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
