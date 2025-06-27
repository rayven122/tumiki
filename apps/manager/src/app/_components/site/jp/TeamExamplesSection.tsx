"use client";

import { motion } from "framer-motion";
import { ArrowRight, Users, Settings, TrendingUp } from "lucide-react";

interface TeamPattern {
  title: string;
  description: string;
  mcpServers: { name: string; purpose: string }[];
  agents: { role: string; access: string[] }[];
  benefits: string[];
}

const teamPatterns: TeamPattern[] = [
  {
    title: "Web開発チーム",
    description: "フロントエンド・バックエンド・運用が連携する開発チーム",
    mcpServers: [
      { name: "GitHub MCP", purpose: "コード管理" },
      { name: "Figma MCP", purpose: "デザイン連携" },
      { name: "Vercel MCP", purpose: "デプロイ・運用" },
      { name: "Notion MCP", purpose: "ドキュメント管理" },
      { name: "Slack MCP", purpose: "コミュニケーション" },
    ],
    agents: [
      { role: "PMエージェント", access: ["GitHub", "Notion", "Slack"] },
      { role: "デザインエージェント", access: ["Figma", "Notion"] },
      {
        role: "フロントエンドエージェント",
        access: ["GitHub", "Vercel", "Slack"],
      },
      { role: "バックエンドエージェント", access: ["GitHub", "DB"] },
      { role: "運用エージェント", access: ["Vercel", "監視ツール"] },
    ],
    benefits: [
      "PMがタスク分解→各エージェントに自動配布",
      "デザイン変更→フロントエージェントが自動反映",
      "バックエンドAPI更新→フロントが自動連携",
      "全工程がSlackで自動報告・進捗共有",
    ],
  },
  {
    title: "モバイルアプリ開発チーム",
    description: "iOS・Android・クロスプラットフォーム開発",
    mcpServers: [
      { name: "GitHub MCP", purpose: "ソースコード管理" },
      { name: "App Store Connect MCP", purpose: "iOS配布" },
      { name: "Google Play Console MCP", purpose: "Android配布" },
      { name: "Firebase MCP", purpose: "バックエンド・分析" },
      { name: "TestFlight MCP", purpose: "ベータテスト" },
    ],
    agents: [
      {
        role: "iOSエージェント",
        access: ["Swift/SwiftUI", "App Store Connect"],
      },
      {
        role: "Androidエージェント",
        access: ["Kotlin/Jetpack Compose", "Google Play"],
      },
      {
        role: "クロスプラットフォームエージェント",
        access: ["React Native/Flutter", "両OS対応"],
      },
      { role: "バックエンドエージェント", access: ["Firebase", "Push通知"] },
      { role: "QA・リリースエージェント", access: ["TestFlight", "審査対応"] },
    ],
    benefits: [
      "各プラットフォーム並行開発→統一バックエンド連携",
      "自動ビルド→TestFlight/内部テスト配布",
      "ストア審査→自動対応・リジェクト修正",
      "アプリ分析→Firebase Analytics自動レポート",
    ],
  },
  {
    title: "AI/ML開発チーム",
    description: "機械学習モデル開発・運用",
    mcpServers: [
      { name: "GitHub MCP", purpose: "モデル・コード管理" },
      { name: "MLflow MCP", purpose: "実験管理・モデル管理" },
      { name: "AWS SageMaker MCP", purpose: "モデル訓練・デプロイ" },
      { name: "Apache Airflow MCP", purpose: "データパイプライン" },
      { name: "Jupyter MCP", purpose: "実験・分析環境" },
    ],
    agents: [
      {
        role: "データエンジニアエージェント",
        access: ["Airflow", "データパイプライン構築"],
      },
      {
        role: "機械学習エンジニアエージェント",
        access: ["MLflow", "SageMaker", "モデル開発"],
      },
      {
        role: "MLOpsエージェント",
        access: ["SageMaker", "本番デプロイ・監視"],
      },
      {
        role: "フィーチャーエンジニアエージェント",
        access: ["Jupyter", "特徴量設計・検証"],
      },
      {
        role: "モニタリングエージェント",
        access: ["CloudWatch", "モデル性能監視"],
      },
    ],
    benefits: [
      "データパイプライン→自動前処理・特徴量生成",
      "実験管理→ハイパーパラメータ最適化",
      "モデル本番化→A/Bテスト・段階的デプロイ",
      "継続監視→性能劣化検知・再訓練",
    ],
  },
  {
    title: "SaaS・B2Bプロダクト開発チーム",
    description: "エンタープライズ向けSaaS開発",
    mcpServers: [
      { name: "GitHub MCP", purpose: "ソースコード管理" },
      { name: "Stripe MCP", purpose: "決済・サブスクリプション" },
      { name: "Auth0 MCP", purpose: "認証・SSO" },
      { name: "Mixpanel MCP", purpose: "ユーザー分析" },
      { name: "Intercom MCP", purpose: "カスタマーサポート" },
    ],
    agents: [
      {
        role: "フロントエンドエージェント",
        access: ["React/Vue", "ダッシュボード開発"],
      },
      {
        role: "バックエンドエージェント",
        access: ["API", "マルチテナント設計"],
      },
      {
        role: "認証・セキュリティエージェント",
        access: ["Auth0", "SSO", "権限管理"],
      },
      {
        role: "決済・課金エージェント",
        access: ["Stripe", "サブスクリプション"],
      },
      { role: "分析・CSエージェント", access: ["Mixpanel", "Intercom"] },
    ],
    benefits: [
      "マルチテナント基盤→セキュアな顧客分離",
      "SSO統合→エンタープライズ認証対応",
      "サブスクリプション→自動課金・アップグレード",
      "ユーザー分析→チャーン予測・改善提案",
    ],
  },
  {
    title: "DevOps・CI/CD特化チーム",
    description: "インフラ自動化・継続的デリバリー",
    mcpServers: [
      { name: "GitHub Actions MCP", purpose: "CI/CDパイプライン" },
      { name: "Docker Hub MCP", purpose: "コンテナレジストリ" },
      { name: "Kubernetes MCP", purpose: "オーケストレーション" },
      { name: "Terraform MCP", purpose: "Infrastructure as Code" },
      { name: "Prometheus MCP", purpose: "監視・メトリクス" },
    ],
    agents: [
      {
        role: "CI/CDエージェント",
        access: ["GitHub Actions", "パイプライン管理"],
      },
      {
        role: "インフラエージェント",
        access: ["Terraform", "K8s", "インフラ構築"],
      },
      { role: "コンテナエージェント", access: ["Docker", "コンテナ最適化"] },
      {
        role: "監視エージェント",
        access: ["Prometheus", "Grafana", "アラート"],
      },
      {
        role: "セキュリティエージェント",
        access: ["コンテナスキャン", "脆弱性対応"],
      },
    ],
    benefits: [
      "Infrastructure as Code→自動インフラ構築",
      "CI/CDパイプライン→自動テスト・デプロイ",
      "コンテナ最適化→軽量・セキュアなイメージ",
      "24/7監視→自動アラート・自己修復",
    ],
  },
  {
    title: "セキュリティ特化開発チーム",
    description: "セキュアコーディング・脆弱性対策",
    mcpServers: [
      { name: "GitHub MCP", purpose: "セキュアコード管理" },
      { name: "SonarQube MCP", purpose: "コード品質・脆弱性分析" },
      { name: "OWASP ZAP MCP", purpose: "セキュリティテスト" },
      { name: "Snyk MCP", purpose: "依存関係脆弱性チェック" },
      { name: "HashiCorp Vault MCP", purpose: "シークレット管理" },
    ],
    agents: [
      {
        role: "セキュアコーディングエージェント",
        access: ["GitHub", "SonarQube"],
      },
      { role: "脆弱性分析エージェント", access: ["OWASP ZAP", "Snyk"] },
      {
        role: "ペネトレーションテストエージェント",
        access: ["侵入テスト", "脆弱性検証"],
      },
      { role: "暗号化・認証エージェント", access: ["Vault", "暗号化実装"] },
      {
        role: "コンプライアンスエージェント",
        access: ["セキュリティ標準準拠", "監査対応"],
      },
    ],
    benefits: [
      "セキュア開発→コード品質チェック・脆弱性検出",
      "自動ペネトレーションテスト→リアルタイム脅威検証",
      "シークレット管理→安全な鍵・認証情報管理",
      "コンプライアンス→SOC2・ISO27001準拠",
    ],
  },
];

export function TeamExamplesSection() {
  return (
    <section className="border-t-3 border-black bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-6 text-4xl font-black tracking-tight text-black md:text-5xl lg:text-6xl">
            実際のAIエージェントチーム構築例
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-600 md:text-xl">
            あらゆる開発領域をカバーする具体的なAIチーム構成パターン
          </p>

          {/* Pattern Overview */}
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="border-2 border-black bg-blue-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">🌐</div>
              <p className="text-sm font-bold">Web・モバイル開発</p>
            </div>
            <div className="border-2 border-black bg-green-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">🤖</div>
              <p className="text-sm font-bold">AI・ML・データ</p>
            </div>
            <div className="border-2 border-black bg-purple-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">☁️</div>
              <p className="text-sm font-bold">インフラ・DevOps</p>
            </div>
            <div className="border-2 border-black bg-red-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">🔒</div>
              <p className="text-sm font-bold">セキュリティ・監査</p>
            </div>
            <div className="border-2 border-black bg-yellow-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">💼</div>
              <p className="text-sm font-bold">エンタープライズ</p>
            </div>
            <div className="border-2 border-black bg-indigo-50 p-4 shadow-[2px_2px_0_#000]">
              <div className="text-2xl">🎮</div>
              <p className="text-sm font-bold">ゲーム・API</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-16">
          {teamPatterns.map((pattern, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="border-3 border-black bg-white p-8 shadow-[6px_6px_0_#000] md:p-12"
            >
              {/* Header */}
              <div className="mb-8 flex items-center gap-4">
                <span className="bg-black px-4 py-2 text-sm font-bold text-white">
                  パターン {index + 1}
                </span>
                <h3 className="text-2xl font-black text-black md:text-3xl">
                  {pattern.title}
                </h3>
              </div>

              <p className="mb-8 text-lg text-gray-700">
                {pattern.description}
              </p>

              <div className="grid gap-8 lg:grid-cols-3">
                {/* MCP Servers */}
                <div className="border-2 border-black bg-blue-50 p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <h4 className="font-black text-black">
                      Tumiki MCP Manager設定
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {pattern.mcpServers.map((server, serverIndex) => (
                      <li key={serverIndex} className="text-sm">
                        <span className="font-bold">{server.name}</span>
                        <span className="text-gray-600">
                          （{server.purpose}）
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* AI Agents */}
                <div className="border-2 border-black bg-green-50 p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <h4 className="font-black text-black">
                      各AIエージェントの専門化
                    </h4>
                  </div>
                  <ul className="space-y-3">
                    {pattern.agents.map((agent, agentIndex) => (
                      <li key={agentIndex} className="text-sm">
                        <div className="font-bold">{agent.role}</div>
                        <div className="text-xs text-gray-600">
                          → {agent.access.join(" + ")}アクセス
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Benefits */}
                <div className="border-2 border-black bg-yellow-50 p-6 shadow-[3px_3px_0_#000]">
                  <div className="mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <h4 className="font-black text-black">実現される協働</h4>
                  </div>
                  <ul className="space-y-2">
                    {pattern.benefits.map((benefit, benefitIndex) => (
                      <li
                        key={benefitIndex}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 bg-green-600" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Flow illustration */}
              <div className="mt-8 border-2 border-gray-300 bg-gray-50 p-6">
                <h5 className="mb-4 font-bold text-gray-800">協働フロー例：</h5>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded bg-indigo-100 px-2 py-1 font-medium">
                    要件定義
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="rounded bg-blue-100 px-2 py-1 font-medium">
                    設計・開発
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="rounded bg-green-100 px-2 py-1 font-medium">
                    テスト・デプロイ
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="rounded bg-yellow-100 px-2 py-1 font-medium">
                    運用・監視
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="border-3 border-black bg-white p-8 shadow-[6px_6px_0_#000]">
            <h3 className="mb-4 text-2xl font-black text-black">
              あなたの業界・用途に合わせたAIチーム構成を提案
            </h3>
            <p className="mb-6 text-gray-700">
              上記以外にも、フロントエンド特化・ゲーム開発・API開発など
              <br />
              あらゆる領域に対応可能。専門エンジニアが最適なMCP構成とエージェント設計をサポートします
            </p>
            <div className="mb-6 grid gap-2 text-xs md:grid-cols-3">
              <span className="rounded bg-gray-100 px-2 py-1">
                フロントエンド特化
              </span>
              <span className="rounded bg-gray-100 px-2 py-1">ゲーム開発</span>
              <span className="rounded bg-gray-100 px-2 py-1">
                API・マイクロサービス
              </span>
              <span className="rounded bg-gray-100 px-2 py-1">
                データサイエンス
              </span>
              <span className="rounded bg-gray-100 px-2 py-1">
                QA・テスト自動化
              </span>
              <span className="rounded bg-gray-100 px-2 py-1">
                カスタム構成
              </span>
            </div>

            {/* <button className="border-2 border-black bg-indigo-500 px-8 py-3 font-bold text-white shadow-[3px_3px_0_#000] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#000]">
              構築相談を申し込む
            </button> */}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
