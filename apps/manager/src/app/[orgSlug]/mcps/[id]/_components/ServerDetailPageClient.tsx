"use client";

type ServerDetailPageClientProps = {
  orgSlug: string;
  serverId: string;
};

export const ServerDetailPageClient = ({
  orgSlug,
  serverId,
}: ServerDetailPageClientProps) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">MCPサーバー詳細</h1>
        <p className="mt-2 text-sm text-gray-600">Organization: {orgSlug}</p>
        <p className="text-sm text-gray-600">Server ID: {serverId}</p>
        <p className="mt-4 text-sm text-gray-500">
          このページは現在実装中です
        </p>
      </div>
    </div>
  );
};
