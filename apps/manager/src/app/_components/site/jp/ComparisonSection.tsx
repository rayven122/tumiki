"use client";

import { motion } from "framer-motion";
import { X, Check, TrendingUp, TrendingDown } from "lucide-react";

interface ComparisonItem {
  category: string;
  traditional: {
    status: "poor" | "limited" | "risky";
    description: string;
  };
  tumiki: {
    status: "excellent" | "good";
    description: string;
  };
}

const comparisons: ComparisonItem[] = [
  {
    category: "専門性",
    traditional: {
      status: "limited",
      description: "汎用的・チーム理解が浅い知識",
    },
    tumiki: {
      status: "excellent",
      description: "役割特化・深い専門性",
    },
  },
  {
    category: "ツール連携",
    traditional: {
      status: "poor",
      description: "手動コピペ・制限あり",
    },
    tumiki: {
      status: "excellent",
      description: "安全な自動連携・実行",
    },
  },
  {
    category: "チーム連携",
    traditional: {
      status: "poor",
      description: "個別利用のみ",
    },
    tumiki: {
      status: "excellent",
      description: "エージェント間協働",
    },
  },
  {
    category: "セキュリティ",
    traditional: {
      status: "risky",
      description: "野放し・リスクあり",
    },
    tumiki: {
      status: "excellent",
      description: "管理制御・監査対応",
    },
  },
  {
    category: "再利用性",
    traditional: {
      status: "poor",
      description: "都度やり直し",
    },
    tumiki: {
      status: "excellent",
      description: "設定保存・テンプレート化",
    },
  },
  {
    category: "運用管理",
    traditional: {
      status: "poor",
      description: "属人的・ブラックボックス",
    },
    tumiki: {
      status: "excellent",
      description: "可視化・組織的管理",
    },
  },
];

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "excellent") {
    return <Check className="h-5 w-5 text-green-600" />;
  }
  if (status === "good") {
    return <Check className="h-5 w-5 text-blue-600" />;
  }
  return <X className="h-5 w-5 text-red-600" />;
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "excellent") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
        ◎ 優秀
      </span>
    );
  }
  if (status === "good") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
        ○ 良好
      </span>
    );
  }
  if (status === "limited") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-800">
        △ 限定的
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
      ✕ 課題あり
    </span>
  );
};

export function ComparisonSection() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-6 text-4xl font-black tracking-tight text-black md:text-5xl lg:text-6xl">
            従来のAI活用 vs TumikiでのAIチーム
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-600 md:text-xl">
            AIの活用レベルを劇的に向上させる違い
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-16 overflow-hidden border-3 border-black bg-white shadow-[8px_8px_0_#000]"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="border-r-2 border-black p-4 text-left font-black">
                    項目
                  </th>
                  <th className="border-r-2 border-black p-4 text-center font-black">
                    従来のAI活用
                  </th>
                  <th className="p-4 text-center font-black">
                    Tumiki利用 + AI
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((item, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="border-r-2 border-black p-4 font-bold">
                      {item.category}
                    </td>
                    <td className="border-r-2 border-black p-4 text-center">
                      <div className="space-y-2">
                        <StatusBadge status={item.traditional.status} />
                        <p className="text-sm text-gray-600">
                          {item.traditional.description}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="space-y-2">
                        <StatusBadge status={item.tumiki.status} />
                        <p className="text-sm text-gray-600">
                          {item.tumiki.description}
                        </p>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Effect Examples */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="border-2 border-red-500 bg-red-50 p-8 shadow-[4px_4px_0_#ef4444]"
          >
            <div className="mb-4 flex items-center gap-3">
              <TrendingDown className="h-6 w-6 text-red-600" />
              <h3 className="text-xl font-black text-red-800">
                従来：AIを利用
              </h3>
            </div>
            <ul className="space-y-2 text-sm text-red-700">
              <li>→ コード生成30%精度*</li>
              <li>→ ツール連携手動</li>
              <li>→ セキュリティリスク</li>
              <li>→ 属人的な活用</li>
              <li>→ 効果が限定的</li>
            </ul>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="border-2 border-green-500 bg-green-50 p-8 shadow-[4px_4px_0_#22c55e]"
          >
            <div className="mb-4 flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-black text-green-800">
                Tumiki環境：専門化されたAIチーム
              </h3>
            </div>
            <ul className="space-y-2 text-sm text-green-700">
              <li>→ コード生成85%精度*</li>
              <li>→ 自動ツール連携</li>
              <li>→ 安全な実行環境</li>
              <li>→ 組織的な活用</li>
              <li>→ 劇的な効果向上</li>
            </ul>
          </motion.div>
        </div>

        {/* Performance metrics visualization */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 border-3 border-black bg-white p-8 shadow-[6px_6px_0_#000]"
        >
          <h3 className="mb-8 text-center text-2xl font-black text-black">
            効果の数値比較
          </h3>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-2 text-3xl font-black text-green-600">85%</div>
              <p className="font-bold">精度向上</p>
              <p className="text-sm text-gray-600">従来の30%から</p>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-black text-blue-600">
                3-5倍
              </div>
              <p className="font-bold">処理速度</p>
              <p className="text-sm text-gray-600">自動連携により</p>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-black text-purple-600">
                70%
              </div>
              <p className="font-bold">エラー削減</p>
              <p className="text-sm text-gray-600">品質管理強化で</p>
            </div>
          </div>
        </motion.div> */}
      </div>
    </section>
  );
}
