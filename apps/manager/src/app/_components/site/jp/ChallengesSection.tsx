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
    title: "AIエージェントの活用限界",
    items: [
      "汎用的で専門性が不足",
      "役割分担・協働ができない",
      "複雑タスクでの精度低下",
      "実務レベルでの継続利用困難",
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
              <div className="absolute -top-2 -left-2 h-4 w-4 border-2 border-black bg-red-500" />
              <div className="absolute -top-2 -right-2 h-4 w-4 border-2 border-black bg-yellow-500" />
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
          className="mt-16 border-3 border-black bg-white p-8 shadow-[6px_6px_0_#000]"
        >
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-around">
            <div className="text-center">
              <div className="mb-2 text-6xl">😔</div>
              <p className="font-bold text-gray-700">バラバラなAI活用</p>
            </div>
            <div className="text-4xl">→</div>
            <div className="text-center">
              <div className="mb-2 text-6xl">🚫</div>
              <p className="font-bold text-gray-700">効果が限定的</p>
            </div>
            <div className="text-4xl">→</div>
            <div className="text-center">
              <div className="mb-2 text-6xl">💸</div>
              <p className="font-bold text-gray-700">投資対効果が低い</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}