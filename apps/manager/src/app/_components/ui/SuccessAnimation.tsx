"use client";

import DOMPurify from "dompurify";
import { motion } from "framer-motion";

interface SuccessAnimationProps {
  title: string;
  description: string;
  className?: string;
}

interface BlockParticle {
  id: number;
  color: string;
  left: string;
  size: number;
}

const BLOCK_COLORS = [
  "#6366f1", // Brand purple
  "#000000", // Black
  "#e5e7eb", // Gray-200
  "#9ca3af", // Gray-400
] as const;

function generateBlockParticles(count: number): BlockParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: BLOCK_COLORS[i % BLOCK_COLORS.length]!,
    left: `${Math.random() * 100}%`,
    size: 12 + Math.random() * 8, // 12-20px
  }));
}

export function SuccessAnimation({
  title,
  description,
  className = "",
}: SuccessAnimationProps) {
  const blockParticles = generateBlockParticles(15);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`py-8 text-center ${className}`}
    >
      {/* Block confetti animation */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {blockParticles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute border-2"
            style={{
              borderColor:
                particle.color === "#000000" ? "#000000" : "transparent",
              backgroundColor: particle.color,
              left: particle.left,
              top: "-20px",
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              boxShadow:
                particle.color === "#6366f1"
                  ? "2px 2px 0 rgba(0,0,0,0.2)"
                  : "none",
            }}
            animate={{
              y: [0, 500],
              rotate: [0, 360],
              opacity: [1, 0],
            }}
            transition={{
              duration: 2.5,
              delay: particle.id * 0.08,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Success icon with block design */}
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
        <div className="mx-auto flex h-20 w-20 items-center justify-center border-4 border-black bg-white shadow-[4px_4px_0_#6366f1]">
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="h-10 w-10 text-black"
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
        className="mb-2 text-3xl font-black tracking-tight text-black"
      >
        {title}
      </motion.h3>

      {/* 説明文 */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="mb-6 text-lg font-medium text-gray-600"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
      />

      {/* Animated blocks effect */}
      <motion.div
        className="flex justify-center space-x-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="h-8 w-8 border-2 border-black bg-black shadow-[2px_2px_0_rgba(0,0,0,0.2)]"
            animate={{
              y: [0, -8, 0],
              rotate: [0, 15, -15, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.2,
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
