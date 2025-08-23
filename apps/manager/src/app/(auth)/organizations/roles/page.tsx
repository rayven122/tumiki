"use client";

import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Users, Shield, Settings, Code } from "lucide-react";

const RolesPage = () => {
  const { currentOrganization, isLoading } = useOrganizationContext();
  const router = useRouter();

  useEffect(() => {
    // 個人組織の場合はMCPサーバーページへリダイレクト
    if (
      !isLoading &&
      (!currentOrganization || currentOrganization.isPersonal)
    ) {
      router.push("/mcp/servers");
    }
  }, [currentOrganization, isLoading, router]);

  if (isLoading || !currentOrganization || currentOrganization.isPersonal) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ヘッダーセクション */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ロール管理</h1>
              <p className="mt-1 text-gray-600">
                組織のメンバーと権限を管理します
              </p>
            </div>
          </div>

          {/* ステータスバッジ */}
          <div className="inline-flex items-center rounded-full bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800">
            <Code className="mr-2 h-4 w-4" />
            開発中の機能
          </div>
        </div>

        {/* 機能プレビューカード */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              メンバー管理
            </h3>
            <p className="text-sm text-gray-600">
              組織のメンバーを招待・管理できます
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              権限設定
            </h3>
            <p className="text-sm text-gray-600">
              カスタムロールと権限を設定できます
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              アクセス制御
            </h3>
            <p className="text-sm text-gray-600">
              リソースへのアクセスを細かく制御できます
            </p>
          </div>
        </div>

        {/* 開発予定の機能 */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-bold text-gray-900">
            開発予定の機能
          </h2>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="mt-2 h-2 w-2 rounded-full bg-blue-500"></div>
              <div>
                <h4 className="font-medium text-gray-900">
                  ロールベースアクセス制御（RBAC）
                </h4>
                <p className="mt-1 text-sm text-gray-600">
                  管理者、編集者、閲覧者などの事前定義ロール
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="mt-2 h-2 w-2 rounded-full bg-blue-500"></div>
              <div>
                <h4 className="font-medium text-gray-900">
                  カスタムロール作成
                </h4>
                <p className="mt-1 text-sm text-gray-600">
                  組織固有のニーズに合わせたロール定義
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="mt-2 h-2 w-2 rounded-full bg-blue-500"></div>
              <div>
                <h4 className="font-medium text-gray-900">
                  メンバー招待システム
                </h4>
                <p className="mt-1 text-sm text-gray-600">
                  メール招待とロール自動割り当て
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="mt-2 h-2 w-2 rounded-full bg-blue-500"></div>
              <div>
                <h4 className="font-medium text-gray-900">監査ログ</h4>
                <p className="mt-1 text-sm text-gray-600">
                  ロール変更とアクセス履歴の追跡
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesPage;
