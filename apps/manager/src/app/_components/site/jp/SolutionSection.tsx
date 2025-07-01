"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface SolutionFeature {
  title: string;
  description: string;
  points: string[];
  imageAlt: string;
  imagePath: string;
}

const solutions: SolutionFeature[] = [
  {
    title: "専門MCPサーバーの統一管理",
    description:
      "複数のMCPサーバーを一元管理し、AIエージェントに専門性を与える",
    points: [
      "GitHub、Jira、Slack、AWS等のMCPサーバーを一元管理",
      "ワンクリックでクラウド上にMCPサーバー起動",
      "各AIエージェントが専門ツールに安全アクセス",
      "Python/Node.js環境構築・メンテナンス不要",
    ],
    imageAlt: "MCP管理ダッシュボード",
    imagePath: "/demo/mcp-overview.png",
  },
  {
    title: "AIエージェントの役割分離・専門化",
    description: "各AIエージェントに明確な役割と権限を設定",
    points: [
      "PMエージェント：プロジェクト管理用MCP接続",
      "FEエージェント：Figma・React・Storybook用MCP",
      "BEエージェント：GitHub・DB・API用MCP",
      "Infraエージェント：AWS・Terraform・監視用MCP",
      "各エージェントの接続先・権限を細かく制御",
    ],
    imageAlt: "役割設定・権限管理画面",
    imagePath: "/demo/role.png",
  },
  {
    title: "安全なチーム環境の提供",
    description: "エンタープライズグレードのセキュリティでAIチームを管理",
    points: [
      "エンタープライズグレードのセキュリティ管理",
      "AIエージェント間の安全なデータ共有",
      "全アクセス・実行ログの記録・監査",
      "リアルタイム監視・緊急停止機能",
      "社内セキュリティポリシーの自動適用",
    ],
    imageAlt: "セキュリティ・監視画面",
    imagePath: "/demo/security.png",
  },
  {
    title: "チーム活用の最適化支援",
    description: "AIチームのパフォーマンスを継続的に改善",
    points: [
      "AIエージェント活動状況の可視化",
      "役割分担・連携効果の測定",
      "ボトルネック・改善点の特定",
      "最適なMCP構成の提案・自動調整",
      "チーム生産性向上の継続サポート",
    ],
    imageAlt: "分析・最適化ダッシュボード",
    imagePath: "/demo/analytics.png",
  },
];

export function SolutionSection() {
  return (
    <section id="solution" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-6 text-4xl font-black tracking-tight text-black md:text-5xl lg:text-6xl">
            Tumiki MCP Managerで
            <br />
            AIエージェントチーム環境を構築
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-600 md:text-xl">
            MCPサーバーの統一管理で、AIに専門性と協働能力を
          </p>
        </motion.div>

        <div className="space-y-24">
          {solutions.map((solution, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className={`flex flex-col gap-12 ${
                index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } items-center`}
            >
              {/* Demo Image */}
              <div className="w-full lg:flex-1">
                <div className="relative border-3 border-black bg-white p-3 shadow-[6px_6px_0_#000] md:p-4">
                  <div className="absolute -top-3 -left-3 h-6 w-6 border-2 border-black bg-indigo-500 shadow-[2px_2px_0_#000]" />
                  <div className="absolute -top-3 -right-3 h-6 w-6 border-2 border-black bg-indigo-500 shadow-[2px_2px_0_#000]" />
                  <div className="relative aspect-[4/3] overflow-hidden rounded border-2 border-gray-200 md:aspect-video">
                    <Image
                      src={solution.imagePath}
                      alt={solution.imageAlt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <p className="mt-2 text-center text-xs text-gray-600">
                    {solution.imageAlt}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <span className="mb-2 inline-block bg-black px-3 py-1 text-sm font-bold text-white">
                  機能 {index + 1}
                </span>
                <h3 className="mb-4 text-2xl font-black text-black md:text-3xl">
                  {solution.title}
                </h3>
                <p className="mb-6 text-lg text-gray-700">
                  {solution.description}
                </p>
                <ul className="space-y-3">
                  {solution.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Central concept illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-24 border-3 border-black bg-indigo-50 p-12 shadow-[8px_8px_0_#000]"
        >
          <div className="text-center">
            <h3 className="mb-8 text-3xl font-black text-black">
              Tumikiが実現するAIチーム環境
            </h3>
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border-2 border-black bg-white p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-2 text-3xl">🎯</div>
                  <p className="font-bold">専門性</p>
                  <p className="mt-2 text-sm text-gray-600">
                    各AIが特定の役割に特化
                  </p>
                </div>
                <div className="border-2 border-black bg-white p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-2 text-3xl">🔗</div>
                  <p className="font-bold">連携</p>
                  <p className="mt-2 text-sm text-gray-600">
                    ツール間の自動連携
                  </p>
                </div>
                <div className="border-2 border-black bg-white p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-2 text-3xl">🛡️</div>
                  <p className="font-bold">安全性</p>
                  <p className="mt-2 text-sm text-gray-600">
                    企業レベルのセキュリティ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
