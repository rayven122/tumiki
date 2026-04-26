"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

/* クライアントバンドル削減のため遅延ロード */
const DashboardMock = dynamic(() => import("./DashboardMock"), { ssr: false });

/* 順次表示コンテナ */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
} as const;

/* 各要素: 下からフェードイン */
const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
} as const;

/* ダッシュボード: 少し遅れて浮き上がる */
const dashboardVariant = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
} as const;

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden pt-14">
      {/* 背景グロー */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-white/[0.015] blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pt-20 pb-12 md:pt-28 md:pb-20">
        {/* テキスト */}
        <motion.div
          className="flex flex-col items-center text-center"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {/* バッジ */}
          <motion.span
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-3.5 py-1 text-xs text-zinc-500"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            特許取得済み — MCP管理インフラ
          </motion.span>

          {/* 見出し（サイズ縮小） */}
          <motion.h1
            variants={fadeUp}
            className="mb-5 max-w-3xl text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-white sm:text-4xl md:text-5xl lg:text-6xl"
          >
            社内AIの全通信を
            <br />
            制御・監査する、
            <br />
            <span className="text-zinc-500">ゼロトラストゲートウェイ</span>
          </motion.h1>

          {/* サブコピー */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg"
          >
            誰が、どのAIツールを、いつ使ったか。
            <br className="hidden sm:block" />
            すべての通信を可視化し、未認証アクセスを自動遮断します。
          </motion.p>

          {/* 問い合わせ導線 */}
          <motion.div
            variants={fadeUp}
            className="mb-6 flex flex-wrap items-center justify-center gap-4"
          >
            <a
              href="/contact"
              className="inline-flex min-h-[44px] items-center rounded-full bg-white px-7 py-3 text-sm font-medium text-black shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all hover:bg-zinc-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.12)]"
            >
              お問い合わせ
            </a>
            <a
              href="#solution"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/[0.08] px-6 py-3 text-sm text-zinc-400 transition-all hover:border-white/[0.15] hover:text-white"
            >
              仕組みを見る
              <span aria-hidden="true">&rarr;</span>
            </a>
          </motion.div>
        </motion.div>

        {/* ダッシュボード（浮き上がりアニメーション） */}
        <motion.div
          className="relative mt-10 md:mt-14"
          variants={dashboardVariant}
          initial="hidden"
          animate="visible"
        >
          <DashboardMock />
          {/* 右端フェードグラデーション */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0a0a0a] to-transparent md:w-32" />
          {/* 下端フェードグラデーション */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0a0a0a] to-transparent md:h-28" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
