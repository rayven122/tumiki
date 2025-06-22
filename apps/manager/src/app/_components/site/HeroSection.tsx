"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  isVisible: boolean;
}

export function HeroSection({ showModal, setShowModal, isVisible }: HeroSectionProps) {
  return (
    <>
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b-2 border-black bg-white transition-all duration-300">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 bg-black shadow-[2px_2px_0_#6366f1]" />
            <span className="text-2xl font-black tracking-tight text-black">
              Tumiki
            </span>
            <span className="bg-black px-2 py-1 text-xs font-bold tracking-wider text-white">
              BETA
            </span>
          </div>

          <div className="hidden items-center gap-10 md:flex">
            <Link
              href="#about"
              className="group relative font-medium text-gray-600 transition-colors hover:text-black"
            >
              Tumikiとは
              <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-black transition-all duration-300 group-hover:w-full" />
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="border-2 border-black bg-black px-7 py-3 font-semibold text-white shadow-[3px_3px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#6366f1]"
            >
              早期アクセス
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section
        id="hero"
        className="relative flex min-h-screen items-center overflow-hidden bg-white pt-24"
      >
        {/* Decorative Blocks */}
        <div className="pointer-events-none absolute inset-0">
          {/* Top Left Corner */}
          <motion.div
            className="absolute top-32 left-8 h-16 w-16 border-2 border-gray-300 bg-gray-100 shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
            animate={{
              y: [0, -10, 0],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-20 left-32 h-12 w-12 border-2 border-gray-200 bg-gray-50 shadow-[3px_3px_0_rgba(0,0,0,0.05)]"
            animate={{
              y: [0, 8, 0],
              rotate: [0, -3, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />

          {/* Top Right Corner */}
          <motion.div
            className="absolute top-40 right-12 h-20 w-20 border-2 border-gray-300 bg-gray-100 shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
            animate={{
              y: [0, -12, 0],
              rotate: [0, -8, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
          <motion.div
            className="absolute top-24 right-40 h-10 w-10 border-2 border-gray-200 bg-gray-50 shadow-[2px_2px_0_rgba(0,0,0,0.05)]"
            animate={{
              y: [0, 6, 0],
              rotate: [0, 4, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />

          {/* Bottom Left Corner */}
          <motion.div
            className="absolute bottom-32 left-16 h-14 w-14 border-2 border-gray-300 bg-gray-100 shadow-[3px_3px_0_rgba(0,0,0,0.1)]"
            animate={{
              y: [0, -8, 0],
              rotate: [0, 6, 0],
            }}
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5,
            }}
          />
          <motion.div
            className="absolute bottom-48 left-6 h-18 w-18 border-2 border-gray-200 bg-gray-50 shadow-[4px_4px_0_rgba(0,0,0,0.05)]"
            animate={{
              y: [0, 10, 0],
              rotate: [0, -5, 0],
            }}
            transition={{
              duration: 6.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3,
            }}
          />

          {/* Bottom Right Corner */}
          <motion.div
            className="absolute right-20 bottom-28 h-16 w-16 border-2 border-gray-300 bg-gray-100 shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
            animate={{
              y: [0, -14, 0],
              rotate: [0, 7, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2.5,
            }}
          />
          <motion.div
            className="absolute right-8 bottom-16 h-12 w-12 border-2 border-gray-200 bg-gray-50 shadow-[3px_3px_0_rgba(0,0,0,0.05)]"
            animate={{
              y: [0, 7, 0],
              rotate: [0, -4, 0],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.8,
            }}
          />

          {/* Side Blocks */}
          <motion.div
            className="absolute top-1/2 left-4 h-10 w-10 border-2 border-gray-300 bg-gray-100 shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
            animate={{
              x: [0, 5, 0],
              rotate: [0, 8, 0],
            }}
            transition={{
              duration: 7.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.8,
            }}
          />
          <motion.div
            className="absolute top-1/2 right-4 h-14 w-14 border-2 border-gray-300 bg-gray-100 shadow-[3px_3px_0_rgba(0,0,0,0.1)]"
            animate={{
              x: [0, -8, 0],
              rotate: [0, -6, 0],
            }}
            transition={{
              duration: 6.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2.2,
            }}
          />

          {/* Subtle Center Blocks */}
          <motion.div
            className="absolute top-20 left-1/2 h-8 w-8 -translate-x-1/2 transform border border-gray-200 bg-gray-50 opacity-60 shadow-[2px_2px_0_rgba(0,0,0,0.03)]"
            animate={{
              y: [0, -5, 0],
              rotate: [0, 3, 0],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 4,
            }}
          />
          <motion.div
            className="absolute bottom-20 left-1/3 h-6 w-6 border border-gray-200 bg-gray-50 opacity-50 shadow-[1px_1px_0_rgba(0,0,0,0.03)]"
            animate={{
              y: [0, 4, 0],
              rotate: [0, -2, 0],
            }}
            transition={{
              duration: 8.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3.5,
            }}
          />
          <motion.div
            className="absolute right-1/3 bottom-32 h-8 w-8 border border-gray-200 bg-gray-50 opacity-60 shadow-[2px_2px_0_rgba(0,0,0,0.03)]"
            animate={{
              y: [0, -6, 0],
              rotate: [0, 4, 0],
            }}
            transition={{
              duration: 7.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.2,
            }}
          />
        </div>

        <div className="relative z-10 mx-auto mt-20 max-w-6xl px-5">
          <div className="text-center">
            <motion.h1
              className="mb-6 text-4xl leading-tight font-black tracking-tight text-black md:text-6xl lg:text-7xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8 }}
            >
              AIを
              <span className="mx-1 inline-block -rotate-1 transform bg-black px-4 text-white shadow-[4px_4px_0_#6366f1]">
                Tumiki
              </span>
              で<br />
              あなた専用にする
            </motion.h1>

            <motion.p
              className="mx-auto mb-12 max-w-4xl text-lg leading-relaxed font-medium text-gray-600 md:text-xl lg:text-2xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Tumikiなら、AIがNotionに記録し、Slackに通知し、カレンダーを調整。
              <br />
              まるでチームに1人"AI社員"がいるような感覚です。
            </motion.p>

            <motion.div
              className="mb-16 flex flex-col items-center justify-center gap-5 sm:flex-row"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <button
                onClick={() => setShowModal(true)}
                className="border-3 border-black bg-black px-10 py-4 text-lg font-bold text-white shadow-[4px_4px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#6366f1]"
              >
                早期アクセスに登録
              </button>
              <button className="flex items-center gap-2 border-b-2 border-transparent font-semibold text-black transition-all duration-300 hover:gap-3 hover:border-black">
                使い方を見る <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            {/* Interactive Block Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: isVisible ? 1 : 0,
                scale: isVisible ? 1 : 0.9,
              }}
              transition={{ duration: 1, delay: 0.6 }}
            >
              {/* <BlockVisual /> */}
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}