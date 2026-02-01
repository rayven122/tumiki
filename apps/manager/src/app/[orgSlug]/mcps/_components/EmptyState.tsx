"use client";

type EmptyStateProps = {
  isAdmin: boolean;
};

/**
 * MCPが未接続時の空状態コンポーネント
 * 管理者にはテンプレート一覧への誘導を、メンバーには管理者への依頼を促す
 */
export const EmptyState = ({ isAdmin }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12">
      <div className="mb-4 text-6xl">📦</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">
        {isAdmin ? "MCPを接続しましょう" : "MCPが未接続です"}
      </h3>
      <p className="mb-4 max-w-md text-sm text-gray-600">
        {isAdmin ? (
          <>
            AIエージェントを強化するMCPを追加して、
            <br />
            様々なツールを利用できます
          </>
        ) : (
          <>
            組織にMCPが接続されていません。
            <br />
            管理者にMCPの追加を依頼してください。
          </>
        )}
      </p>
      {isAdmin && (
        <p className="text-sm text-gray-500">
          ↓ 下のテンプレートから選んで追加
        </p>
      )}
    </div>
  );
};
