"use client";

import Link from "next/link";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl">
              AIエージェントチーム環境を、
              <br />
              これ一つでシンプルに構築
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
              複数のSaaSツールとAIエージェントを統一管理し、チーム全体の生産性を向上させるプラットフォームです。
              MCPサーバーの一元管理により、煩雑な設定作業を劇的に簡素化します。
            </p>
            <Link
              href="/pricing"
              className="inline-block rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              料金プランを見る
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-gray-50 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
              主な特徴
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <svg
                    className="h-8 w-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  統一管理
                </h3>
                <p className="text-gray-600">
                  複数のMCPサーバーを一つのダッシュボードで管理。設定の複雑さを解消します。
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg
                    className="h-8 w-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  高速セットアップ
                </h3>
                <p className="text-gray-600">
                  数分でAIエージェントチーム環境を構築。専門知識不要で即座に開始できます。
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                  <svg
                    className="h-8 w-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  セキュア運用
                </h3>
                <p className="text-gray-600">
                  企業レベルのセキュリティで、機密情報を安全に管理・運用できます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              まずは料金プランをご確認ください
            </h2>
            <p className="mb-8 text-lg text-gray-600">
              透明性のある料金体系で、あなたのチームに最適なプランをお選びいただけます。
            </p>
            <Link
              href="/pricing"
              className="inline-block rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              料金プランを確認する
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
