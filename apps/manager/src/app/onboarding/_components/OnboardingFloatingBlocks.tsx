"use client";

import { motion } from "framer-motion";

// フローティングブロックの設定型
type FloatingBlockConfig = {
  id: string;
  className: string;
  animate: {
    y?: number[];
    x?: number[];
    rotate: number[];
  };
  duration: number;
  delay?: number;
};

// ブロック設定の定義
const floatingBlocks: FloatingBlockConfig[] = [
  // Top Left Corner
  {
    id: "top-left-1",
    className:
      "absolute top-24 left-8 h-12 w-12 border-2 border-gray-200 bg-gray-50 shadow-[3px_3px_0_rgba(0,0,0,0.05)]",
    animate: { y: [0, -8, 0], rotate: [0, 4, 0] },
    duration: 6,
  },
  {
    id: "top-left-2",
    className:
      "absolute top-40 left-20 h-8 w-8 border-2 border-indigo-200 bg-indigo-50 shadow-[2px_2px_0_rgba(99,102,241,0.1)]",
    animate: { y: [0, 6, 0], rotate: [0, -3, 0] },
    duration: 5,
    delay: 1,
  },
  // Top Right Corner
  {
    id: "top-right-1",
    className:
      "absolute top-28 right-12 h-14 w-14 border-2 border-gray-200 bg-gray-50 shadow-[3px_3px_0_rgba(0,0,0,0.05)]",
    animate: { y: [0, -10, 0], rotate: [0, -6, 0] },
    duration: 7,
    delay: 2,
  },
  {
    id: "top-right-2",
    className:
      "absolute top-48 right-24 h-10 w-10 border-2 border-indigo-200 bg-indigo-50 shadow-[2px_2px_0_rgba(99,102,241,0.1)]",
    animate: { y: [0, 5, 0], rotate: [0, 3, 0] },
    duration: 4.5,
    delay: 0.5,
  },
  // Bottom Left Corner
  {
    id: "bottom-left-1",
    className:
      "absolute bottom-32 left-12 h-10 w-10 border-2 border-gray-200 bg-gray-50 shadow-[2px_2px_0_rgba(0,0,0,0.05)]",
    animate: { y: [0, -6, 0], rotate: [0, 5, 0] },
    duration: 5.5,
    delay: 1.5,
  },
  {
    id: "bottom-left-2",
    className:
      "absolute bottom-48 left-6 h-6 w-6 border-2 border-indigo-200 bg-indigo-50 shadow-[2px_2px_0_rgba(99,102,241,0.1)]",
    animate: { y: [0, 8, 0], rotate: [0, -4, 0] },
    duration: 6.5,
    delay: 3,
  },
  // Bottom Right Corner
  {
    id: "bottom-right-1",
    className:
      "absolute right-16 bottom-28 h-12 w-12 border-2 border-gray-200 bg-gray-50 shadow-[3px_3px_0_rgba(0,0,0,0.05)]",
    animate: { y: [0, -10, 0], rotate: [0, 5, 0] },
    duration: 8,
    delay: 2.5,
  },
  {
    id: "bottom-right-2",
    className:
      "absolute right-8 bottom-44 h-8 w-8 border-2 border-indigo-200 bg-indigo-50 shadow-[2px_2px_0_rgba(99,102,241,0.1)]",
    animate: { y: [0, 6, 0], rotate: [0, -3, 0] },
    duration: 4.5,
    delay: 0.8,
  },
  // Side Blocks
  {
    id: "side-left",
    className:
      "absolute top-1/2 left-4 h-6 w-6 border-2 border-gray-200 bg-gray-50 shadow-[2px_2px_0_rgba(0,0,0,0.05)]",
    animate: { x: [0, 4, 0], rotate: [0, 6, 0] },
    duration: 7.5,
    delay: 1.8,
  },
  {
    id: "side-right",
    className:
      "absolute top-1/2 right-4 h-10 w-10 border-2 border-gray-200 bg-gray-50 shadow-[2px_2px_0_rgba(0,0,0,0.05)]",
    animate: { x: [0, -6, 0], rotate: [0, -4, 0] },
    duration: 6.8,
    delay: 2.2,
  },
  // ブランドカラーのアクセントブロック
  {
    id: "accent-1",
    className:
      "absolute top-1/3 left-1/4 h-4 w-4 border-2 border-indigo-300 bg-indigo-100 opacity-40",
    animate: { y: [0, -4, 0], rotate: [0, 8, 0] },
    duration: 9,
    delay: 4,
  },
  {
    id: "accent-2",
    className:
      "absolute right-1/4 bottom-1/3 h-5 w-5 border-2 border-indigo-300 bg-indigo-100 opacity-40",
    animate: { y: [0, 5, 0], rotate: [0, -5, 0] },
    duration: 8.5,
    delay: 3.5,
  },
];

/**
 * オンボーディングページ用のフローティングブロック装飾
 * ランディングページのFloatingBlocksをベースに、控えめなスタイルで実装
 */
export const OnboardingFloatingBlocks = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {floatingBlocks.map((block) => (
      <motion.div
        key={block.id}
        className={block.className}
        animate={block.animate}
        transition={{
          duration: block.duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: block.delay,
        }}
      />
    ))}
  </div>
);
