"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // ローディングアニメーションを表示する時間（ミリ秒）
    const loadingTime = 2500

    const timer = setTimeout(() => {
      setIsLoading(false)
    }, loadingTime)

    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.5, ease: "easeInOut" },
          }}
        >
          <div className="flex flex-col items-center">
            {/* ロゴのアニメーション - 積層構造 */}
            <motion.div
              className="flex items-center justify-center mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="relative">
                {/* Base Layer */}
                <motion.div
                  className="w-12 h-12 bg-primary rounded-lg"
                  initial={{ scale: 0, rotateY: 0 }}
                  animate={{ 
                    scale: 1,
                    rotateY: [0, 360]
                  }}
                  transition={{
                    scale: { duration: 0.5, ease: "easeOut" },
                    rotateY: {
                      duration: 3,
                      ease: "linear",
                      repeat: Number.POSITIVE_INFINITY,
                    }
                  }}
                />
                
                {/* Middle Layer */}
                <motion.div
                  className="absolute top-0 left-0 w-10 h-10 bg-blue-700 rounded-lg"
                  initial={{ scale: 0, y: 0, rotateY: 0 }}
                  animate={{ 
                    scale: 1,
                    y: -8,
                    rotateY: [0, 360]
                  }}
                  transition={{
                    scale: { duration: 0.5, ease: "easeOut", delay: 0.2 },
                    y: { duration: 0.5, ease: "easeOut", delay: 0.2 },
                    rotateY: {
                      duration: 3,
                      ease: "linear",
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 0.5
                    }
                  }}
                />
                
                {/* Top Layer */}
                <motion.div
                  className="absolute top-0 left-1 w-8 h-8 bg-blue-500 rounded-lg"
                  initial={{ scale: 0, y: 0, rotateY: 0 }}
                  animate={{ 
                    scale: 1,
                    y: -16,
                    rotateY: [0, 360]
                  }}
                  transition={{
                    scale: { duration: 0.5, ease: "easeOut", delay: 0.4 },
                    y: { duration: 0.5, ease: "easeOut", delay: 0.4 },
                    rotateY: {
                      duration: 3,
                      ease: "linear",
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 1
                    }
                  }}
                />
              </div>
            </motion.div>

            {/* テキストのアニメーション */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <motion.h1
                className="text-4xl font-bold tracking-widest mb-2"
                animate={{ letterSpacing: ["0.1em", "0.25em", "0.1em"] }}
                transition={{
                  duration: 2,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 0.5,
                }}
              >
                Tumiki
              </motion.h1>
              <motion.div
                className="w-full h-px bg-black mb-2 mx-auto"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.8, duration: 0.8 }}
              ></motion.div>
              <motion.p
                className="text-sm text-gray-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                生成AIに安全ルールを与えるクラウド統制基盤
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
