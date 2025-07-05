"use client";

import { motion } from "framer-motion";

interface ChallengeCard {
  icon: string;
  title: string;
  items: string[];
}

const challenges: ChallengeCard[] = [
  {
    icon: "🤖",
    title: "AIの活用限界",
    items: [
      "汎用的で専門性が不足",
      "複雑なタスクでの精度低下",
      "実務レベルでの継続利用困難",
      "ツール連携・セキュリティの壁",
    ],
  },
  {
    icon: "🔌",
    title: "ツール連携・セキュリティの壁",
    items: [
      "GitHub・AWS・Slackへの安全接続困難",
      "認証・権限管理の複雑さ",
      "社内セキュリティ要件への非対応",
      "実行ログ・監査証跡の欠如",
      "MCPサーバー個別構築の技術的ハードル",
    ],
  },
  {
    icon: "📊",
    title: "チーム活用・運用管理の課題",
    items: [
      "AIエージェント間の連携なし",
      "作業分担・役割分離ができない",
      "進捗・品質管理の仕組みなし",
      "組織的なAI活用戦略の欠如",
    ],
  },
];

export function ChallengesSection() {
  return (
    <section className="border-t-3 border-black bg-gray-50 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-6 text-4xl font-black tracking-tight text-black md:text-5xl lg:text-6xl">
            AIエージェントを実務で活用できていますか？
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-600 md:text-xl">
            多くの企業が直面している、AI活用の現実的な課題
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {challenges.map((challenge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative border-2 border-black bg-white p-8 shadow-[4px_4px_0_#000] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#000]"
            >
              {/* Decorative corner blocks */}
              <div className="absolute -left-2 -top-2 h-4 w-4 border-2 border-black bg-red-500" />
              <div className="absolute -right-2 -top-2 h-4 w-4 border-2 border-black bg-yellow-500" />
              <div className="absolute -bottom-2 -left-2 h-4 w-4 border-2 border-black bg-blue-500" />
              <div className="absolute -bottom-2 -right-2 h-4 w-4 border-2 border-black bg-green-500" />

              <div className="mb-4 text-5xl">{challenge.icon}</div>
              <h3 className="mb-6 text-xl font-black text-black">
                {challenge.title}
              </h3>
              <ul className="space-y-3">
                {challenge.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 bg-black" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Problem illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="border-3 mt-16 border-black bg-gradient-to-r from-red-50 to-orange-50 p-6 shadow-[6px_6px_0_#000] md:p-8"
        >
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-black text-red-800 md:text-3xl">
              よくある失敗パターン
            </h3>
            <p className="mt-2 text-sm text-red-600 md:text-base">
              個別導入から始まる悪循環
            </p>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-around md:gap-4">
            {/* Step 1 */}
            <motion.div
              className="relative flex-1"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="group relative border-2 border-red-300 bg-white p-4 text-center shadow-[3px_3px_0_rgba(239,68,68,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[4px_4px_0_rgba(239,68,68,0.4)] md:p-6">
                <div className="mb-3 text-4xl md:text-5xl">🤖</div>
                <h4 className="mb-2 text-lg font-bold text-red-800 md:text-xl">
                  個別ツール導入
                </h4>
                <p className="text-xs text-red-600 md:text-sm">
                  ChatGPT、Claude、Copilot等を
                  <br />
                  バラバラに導入
                </p>
              </div>
            </motion.div>

            {/* Arrow 1 */}
            <div className="flex justify-center md:flex-shrink-0">
              <div className="text-2xl text-red-500 md:hidden">↓</div>
              <div className="hidden text-2xl text-red-500 md:block">→</div>
            </div>

            {/* Step 2 */}
            <motion.div
              className="relative flex-1"
              initial={{ opacity: 0, x: 0 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="group relative border-2 border-orange-300 bg-white p-4 text-center shadow-[3px_3px_0_rgba(251,146,60,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[4px_4px_0_rgba(251,146,60,0.4)] md:p-6">
                <div className="mb-3 text-4xl md:text-5xl">🚫</div>
                <h4 className="mb-2 text-lg font-bold text-orange-800 md:text-xl">
                  効果測定困難
                </h4>
                <p className="text-xs text-orange-600 md:text-sm">
                  連携なし、専門性なし
                  <br />
                  ROI測定不可
                </p>
              </div>
            </motion.div>

            {/* Arrow 2 */}
            <div className="flex justify-center md:flex-shrink-0">
              <div className="text-2xl text-red-500 md:hidden">↓</div>
              <div className="hidden text-2xl text-red-500 md:block">→</div>
            </div>

            {/* Step 3 */}
            <motion.div
              className="relative flex-1"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <div className="group relative border-2 border-red-400 bg-white p-4 text-center shadow-[3px_3px_0_rgba(239,68,68,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[4px_4px_0_rgba(239,68,68,0.5)] md:p-6">
                <div className="mb-3 text-4xl md:text-5xl">💸</div>
                <h4 className="mb-2 text-lg font-bold text-red-800 md:text-xl">
                  予算の無駄遣い
                </h4>
                <p className="text-xs text-red-600 md:text-sm">
                  継続利用されず
                  <br />
                  投資対効果が極めて低い
                </p>
              </div>
            </motion.div>
          </div>

          {/* Call to action */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <div className="mx-auto max-w-md rounded border-2 border-red-300 bg-red-100 p-4">
              <p className="text-sm font-bold text-red-800 md:text-base">
                💡 この悪循環を断ち切るには？
              </p>
              <p className="mt-2 text-xs text-red-700 md:text-sm">
                統合されたAIチーム環境が必要です
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
