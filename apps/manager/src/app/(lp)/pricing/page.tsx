"use client";

import Link from "next/link";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";

export default function PricingPage() {
  const plans = [
    {
      name: "ベーシックプラン",
      price: "980円",
      period: "月額",
      description: "個人利用や小規模チームに最適",
      features: [
        "MCPサーバー管理 最大5台",
        "基本的なダッシュボード機能",
        "メールサポート",
        "月間API呼び出し 10,000回まで",
        "基本的なセキュリティ機能",
      ],
      buttonText: "ベーシックプランで始める",
      popular: false,
    },
    {
      name: "プロプラン",
      price: "2,980円",
      period: "月額",
      description: "成長企業のチーム向け",
      features: [
        "MCPサーバー管理 最大20台",
        "高度なダッシュボード機能",
        "優先メールサポート",
        "月間API呼び出し 50,000回まで",
        "高度なセキュリティ機能",
        "チーム管理機能",
        "詳細なログ・分析機能",
      ],
      buttonText: "プロプランで始める",
      popular: true,
    },
    {
      name: "エンタープライズプラン",
      price: "要相談",
      period: "",
      description: "大企業向けカスタマイズ対応",
      features: [
        "MCPサーバー管理 無制限",
        "カスタムダッシュボード",
        "24時間電話・チャットサポート",
        "API呼び出し無制限",
        "エンタープライズセキュリティ",
        "高度なチーム管理・権限設定",
        "カスタムインテグレーション",
        "専用サポート担当者",
      ],
      buttonText: "お問い合わせ",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          {/* Header Section */}
          <div className="mb-16 text-center">
            <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl">
              料金プラン
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-gray-600">
              透明性のある料金体系で、あなたのチームに最適なプランをお選びください。
              全プラン税込価格表示、いつでも解約可能です。
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl border-2 bg-white p-8 shadow-lg ${
                  plan.popular ? "border-blue-500" : "border-gray-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform">
                    <span className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white">
                      おすすめ
                    </span>
                  </div>
                )}

                <div className="mb-8 text-center">
                  <h3 className="mb-2 text-2xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="mb-4 text-gray-600">{plan.description}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="ml-2 text-gray-600">
                        {plan.period} (税込)
                      </span>
                    )}
                  </div>
                </div>

                <ul className="mb-8 space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <svg
                        className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full rounded-lg px-6 py-3 font-semibold transition-colors ${
                    plan.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>

          {/* Additional Information */}
          <div className="mt-16 text-center">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              よくある質問
            </h2>
            <div className="mx-auto max-w-3xl space-y-6 text-left">
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Q: 支払い方法について教えてください
                </h3>
                <p className="text-gray-600">
                  A: クレジットカード（Visa、MasterCard、JCB、American
                  Express）でのお支払いが可能です。
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Q: 解約はいつでもできますか？
                </h3>
                <p className="text-gray-600">
                  A:
                  はい、いつでもマイページから解約可能です。次回請求日までに解約すれば、それ以降の請求は発生しません。
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Q: プラン変更は可能ですか？
                </h3>
                <p className="text-gray-600">
                  A:
                  はい、マイページからいつでもプラン変更が可能です。アップグレードは即座に反映され、ダウングレードは次回請求日から適用されます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
