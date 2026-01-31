"use client";

import { Server } from "lucide-react";

/**
 * MCPが未接続時の空状態コンポーネント
 * テンプレート一覧への誘導を促す
 */
export const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
        <Server className="h-8 w-8 text-purple-600" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        MCPを接続しましょう
      </h3>
      <p className="mb-4 max-w-md text-sm text-gray-600">
        AIエージェントを強化するMCPを追加して、
        <br />
        様々なツールを利用できます
      </p>
      <p className="text-sm text-gray-500">↓ 下のテンプレートから選んで追加</p>
    </div>
  );
};
