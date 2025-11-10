/* eslint-disable */
// @ts-nocheck
// TODO: Rewrite OAuth functionality for Auth.js + Keycloak
"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { ServerCard } from "../_components/ServerCard";
import { ServerCardSkeleton } from "../_components/ServerCard/ServerCardSkeleton";
import { AddRemoteServerCard } from "./add/AddRemoteServerCard";
import { useState } from "react";
import { CustomMcpServerModal } from "./add/CustomMcpServerModal";
import { toast } from "@/utils/client/toast";

const AsyncAvailableServersList = () => {
  const [mcpServers] = api.mcpServer.findAll.useSuspenseQuery();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 既に追加済みのサーバーIDを取得
  const addedServerIds = new Set<string>([]);

  // 未追加のサーバーのみフィルタリング
  const availableServers = mcpServers.filter(
    (server) => !addedServerIds.has(server.id),
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AddRemoteServerCard onConnect={() => setCreateDialogOpen(true)} />
        {availableServers.map((mcpServer) => (
          <ServerCard key={mcpServer.id} mcpServer={mcpServer} />
        ))}
      </div>

      <CustomMcpServerModal
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
};

function AvailableServersListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ServerCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AvailableServersList() {
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  // OAuth トークンを保存するミューテーション
  const { mutate: saveTokenToEnvVars } =
    api.oauth.saveTokenToEnvVars.useMutation({
      onSuccess: async () => {
        toast.success("OAuth認証が完了しました。");
        await utils.userMcpServerInstance.invalidate();
        // URLからパラメータをクリア
        window.history.replaceState({}, "", "/mcp/servers");
      },
      onError: (error) => {
        toast.error(`OAuth認証に失敗しました: ${error.message}`);
      },
    });

  // OAuth コールバック処理
  useEffect(() => {
    const oauthCallback = searchParams.get("oauth_callback");
    const configId = searchParams.get("configId");
    const scopes = searchParams.get("scopes");

    if (oauthCallback && configId) {
      if (oauthCallback === "github") {
        const scopesArray = scopes ? scopes.split(",") : ["repo", "read:user"];

        saveTokenToEnvVars({
          userMcpServerConfigId: configId,
          provider: "github",
          tokenKey: "GITHUB_PERSONAL_ACCESS_TOKEN",
          scopes: scopesArray,
        });
      } else if (oauthCallback === "figma") {
        const scopesArray = scopes ? scopes.split(",") : ["file_read"];

        saveTokenToEnvVars({
          userMcpServerConfigId: configId,
          provider: "figma",
          tokenKey: "FIGMA_OAUTH_TOKEN",
          scopes: scopesArray,
        });
      }
    }
  }, [searchParams, saveTokenToEnvVars]);

  return (
    <Suspense fallback={<AvailableServersListSkeleton />}>
      <AsyncAvailableServersList />
    </Suspense>
  );
}
