"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TypingIndicatorProps = {
  className?: string;
  /** ドットのサイズ (デフォルト: 6px) */
  size?: "sm" | "md";
};

/**
 * タイピングインジケーター
 * 3つのドットが波打つアニメーションで「入力中」を表現
 */
export const TypingIndicator = ({
  className,
  size = "md",
}: TypingIndicatorProps) => {
  const dotSize = size === "sm" ? "size-1.5" : "size-2";

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label="入力中"
    >
      <motion.span
        className={cn(dotSize, "rounded-full bg-current")}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className={cn(dotSize, "rounded-full bg-current")}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      />
      <motion.span
        className={cn(dotSize, "rounded-full bg-current")}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      />
    </span>
  );
};
