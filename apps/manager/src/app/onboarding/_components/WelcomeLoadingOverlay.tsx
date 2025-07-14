"use client";

import { useEffect, useState } from "react";
import { Sparkles, Heart, Zap } from "lucide-react";

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
    subtitle: "新しい冒険が始まります",
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
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-sm animate-gradient-x" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            {i % 3 === 0 ? (
              <Sparkles className="h-4 w-4 text-yellow-300 opacity-70" />
            ) : i % 3 === 1 ? (
              <Heart className="h-3 w-3 text-pink-300 opacity-70" />
            ) : (
              <Zap className="h-3 w-3 text-blue-300 opacity-70" />
            )}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center">
        {isCompleting ? (
          <div className="animate-in fade-in duration-700">
            <div className="text-8xl mb-6 animate-bounce">🎊</div>
            <h2 className="text-5xl font-bold text-white mb-6 animate-pulse">
              準備完了！
            </h2>
            <p className="text-2xl text-white/90 mb-4">
              さあ、始めましょう！
            </p>
            <div className="flex justify-center space-x-1">
              {[0, 1, 2, 3, 4].map((dot) => (
                <div
                  key={dot}
                  className="w-2 h-2 bg-white rounded-full animate-pulse"
                  style={{
                    animationDelay: `${dot * 0.1}s`,
                    animationDuration: "0.6s",
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-slide-up duration-700" key={currentMessageIndex}>
            {/* Icon with enhanced animation */}
            <div className="text-9xl mb-8 animate-bounce-slow">
              {currentMessage?.icon}
            </div>
            
            {/* Tumiki logo with enhanced glow */}
            <div className="mb-10">
              <div className="inline-block px-8 py-4 bg-white/15 backdrop-blur-md rounded-full border border-white/30 shadow-2xl">
                <span className="text-3xl font-bold text-white animate-pulse-slow">
                  Tumiki
                </span>
              </div>
            </div>

            {/* Message content with enhanced styling */}
            <div className="space-y-6">
              <h2 className="text-5xl font-bold text-white mb-6 animate-slide-in">
                {currentMessage?.title}
              </h2>
              <p className="text-2xl text-white/90 animate-slide-in-delay">
                {currentMessage?.subtitle}
              </p>
            </div>

            {/* Enhanced loading indicator */}
            <div className="mt-10 flex justify-center">
              <div className="flex space-x-3">
                {[0, 1, 2, 3].map((dot) => (
                  <div
                    key={dot}
                    className="w-4 h-4 bg-white/70 rounded-full animate-bounce"
                    style={{
                      animationDelay: `${dot * 0.15}s`,
                      animationDuration: "1.2s",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-delay {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-gradient-x {
          background-size: 400% 400%;
          animation: gradient-x 6s ease infinite;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in-delay 0.8s ease-out 0.3s both;
        }

        .animate-bounce-slow {
          animation: bounce 2s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse 3s ease-in-out infinite;
        }

        .animate-slide-up {
          animation: slide-up 0.7s ease-out;
        }

        .animate-slide-in {
          animation: slide-in 0.9s ease-out;
        }

        .animate-slide-in-delay {
          animation: slide-in 0.9s ease-out 0.4s both;
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};