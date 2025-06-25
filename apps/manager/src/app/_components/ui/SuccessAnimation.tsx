"use client";

import { motion } from "framer-motion";

interface SuccessAnimationProps {
  title: string;
  description: string;
  className?: string;
}

interface ConfettiParticle {
  id: number;
  color: string;
  left: string;
}

const CONFETTI_COLORS = [
  "#6366f1",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#ef4444",
] as const;

function generateConfettiParticles(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
    left: `${Math.random() * 100}%`,
  }));
}

export function SuccessAnimation({
  title,
  description,
  className = "",
}: SuccessAnimationProps) {
  const confettiParticles = generateConfettiParticles(20);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`py-8 text-center ${className}`}
    >
      {/* 紙吹雪アニメーション */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confettiParticles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute h-3 w-3 rounded-full"
            style={{
              backgroundColor: particle.color,
              left: particle.left,
              top: "-10px",
            }}
            animate={{
              y: [0, 400],
              rotate: [0, 360],
              opacity: [1, 0],
            }}
            transition={{
              duration: 3,
              delay: particle.id * 0.1,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* 成功アイコン */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 10,
          delay: 0.2,
        }}
        className="mb-6"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-500 bg-green-100">
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="h-10 w-10 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </motion.svg>
        </div>
      </motion.div>

      {/* タイトル */}
      <motion.h3
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mb-2 text-2xl font-black text-black"
      >
        {title}
      </motion.h3>

      {/* 説明文 */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="mb-6 text-gray-600"
        dangerouslySetInnerHTML={{ __html: description }}
      />

      {/* パルスエフェクト */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="mb-4 text-6xl"
      >
        🎉
      </motion.div>
    </motion.div>
  );
}
