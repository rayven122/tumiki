"use client";

import { useSearchParams } from "next/navigation";

const RolesPage = () => {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");

  if (!orgId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">エラー</h1>
          <p className="mt-2 text-gray-600">組織が選択されていません。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">ロール管理</h1>
      <p className="mt-2 text-gray-600">
        組織ID: {orgId} のロール管理機能は開発中です。
      </p>
    </div>
  );
};

export default RolesPage;
