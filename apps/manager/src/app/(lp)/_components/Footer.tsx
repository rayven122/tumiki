"use client";

import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Tumiki</h3>
            <p className="text-sm text-gray-600">
              MCPサーバーの統一管理でAIエージェントチーム環境を構築
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-gray-900">
              サービス
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  トップページ
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  料金プラン
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-gray-900">
              法的情報
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/legal/tokusho"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  特定商取引法に基づく表記
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  利用規約
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-center text-sm text-gray-600">
            © 2024 株式会社RAYVEN. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
