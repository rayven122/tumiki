"use client";

import { useSearchParams } from "next/navigation";
import { Users, Shield, Settings, Code } from "lucide-react";

const RolesPage = () => {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");

  if (!orgId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセスエラー</h1>
          <p className="text-gray-600">組織が選択されていません。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダーセクション */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ロール管理</h1>
              <p className="text-gray-600 mt-1">組織のメンバーと権限を管理します</p>
            </div>
          </div>
          
          {/* ステータスバッジ */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
            <Code className="w-4 h-4 mr-2" />
            開発中の機能
          </div>
        </div>

        {/* 機能プレビューカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">メンバー管理</h3>
            <p className="text-gray-600 text-sm">組織のメンバーを招待・管理できます</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">権限設定</h3>
            <p className="text-gray-600 text-sm">カスタムロールと権限を設定できます</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">アクセス制御</h3>
            <p className="text-gray-600 text-sm">リソースへのアクセスを細かく制御できます</p>
          </div>
        </div>

        {/* 開発予定の機能 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">開発予定の機能</h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-900">ロールベースアクセス制御（RBAC）</h4>
                <p className="text-gray-600 text-sm mt-1">管理者、編集者、閲覧者などの事前定義ロール</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-900">カスタムロール作成</h4>
                <p className="text-gray-600 text-sm mt-1">組織固有のニーズに合わせたロール定義</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-900">メンバー招待システム</h4>
                <p className="text-gray-600 text-sm mt-1">メール招待とロール自動割り当て</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-900">監査ログ</h4>
                <p className="text-gray-600 text-sm mt-1">ロール変更とアクセス履歴の追跡</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesPage;
