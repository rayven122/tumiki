"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export const CTASection = () => {
  return (
    <section className="border-t-3 border-black bg-gradient-to-br from-indigo-50 to-purple-50 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="mb-6 text-4xl font-black tracking-tight text-black md:text-5xl lg:text-6xl">
            あなたの組織でも、今すぐ
            <br />
            <span className="inline-block bg-black px-4 py-2 text-white shadow-[4px_4px_0_#6366f1]">
              AIエージェントチーム環境
            </span>
            <br />
            を構築しませんか？
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mb-12 max-w-4xl text-lg text-gray-700 md:text-xl"
          >
            {/* 30日間の無料トライアルで、 */}
            MCPサーバー統一管理と
            <br />
            AIエージェントの専門化・チーム化を実体験。
            <br />
            設定サポート付きで、確実に効果を実感いただけます。
          </motion.p>

          {/* Main CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-12"
          >
            <Link
              href="/signup"
              className="mb-6 inline-block border-3 border-black bg-black px-12 py-5 text-xl font-bold text-white shadow-[6px_6px_0_#6366f1] transition-all duration-300 hover:-translate-x-2 hover:-translate-y-2 hover:shadow-[12px_12px_0_#6366f1]"
            >
              無料で始める
            </Link>

            {/* Sub CTAs */}
            {/* <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button className="flex items-center gap-2 border-2 border-black bg-white px-6 py-3 font-bold text-black shadow-[3px_3px_0_#000] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#000]">
                <ArrowRight className="h-4 w-4" />
                構築デモを見る
              </button>
              <button className="flex items-center gap-2 border-2 border-black bg-white px-6 py-3 font-bold text-black shadow-[3px_3px_0_#000] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#000]">
                <Download className="h-4 w-4" />
                導入事例集をダウンロード
              </button>
              <button className="flex items-center gap-2 border-2 border-black bg-white px-6 py-3 font-bold text-black shadow-[3px_3px_0_#000] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#000]">
                <MessageCircle className="h-4 w-4" />
                専門家に相談
              </button>
            </div> */}
          </motion.div>

          {/* Trust signals */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mb-12 border-2 border-black bg-white p-8 shadow-[4px_4px_0_#000]"
          >
            <h3 className="mb-6 text-xl font-black text-black">安心の保証</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                "クレジットカード不要",
                "30日間フル機能利用可能",
                "専任エンジニアによる構築サポート",
                "いつでもキャンセル可能",
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </motion.div> */}

          {/* Final message */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="border-3 border-black bg-black p-8 text-white shadow-[6px_6px_0_#6366f1]"
          >
            <p className="mb-2 text-2xl font-black">
              AIを「個人ツール」から「チーム戦力」へ。
            </p>
            <p className="text-lg">
              Tumiki MCP
              Managerで、あなたの組織のAI活用を次のレベルに押し上げましょう。
            </p>
          </motion.div> */}
        </motion.div>
      </div>
    </section>
  );
};
