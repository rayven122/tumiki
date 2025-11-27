/* eslint-disable */
// @ts-nocheck
// TODO: Rewrite OAuth functionality for Auth.js + Keycloak
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { ServerCard } from "./ServerCard";
import { toast } from "@/utils/client/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AsyncAvailableServersList = ({ orgSlug }: { orgSlug: string }) => {
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
        <Card
          className="flex cursor-pointer items-center justify-center border-2 border-dashed border-gray-300 transition-colors hover:border-purple-400 hover:bg-purple-50"
          onClick={() => setCreateDialogOpen(true)}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Plus className="mb-2 h-12 w-12 text-gray-400" />
            <p className="text-center text-sm font-medium text-gray-600">
              カスタムMCPサーバーを追加
            </p>
          </CardContent>
        </Card>
        {availableServers.map((mcpServer) => (
          <ServerCard key={mcpServer.id} mcpServer={mcpServer} />
        ))}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カスタムMCPサーバーを追加</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center text-gray-600">
            この機能は現在開発中です
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

function AvailableServersListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

export function AvailableServersList({ orgSlug }: { orgSlug: string }) {
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  // OAuth トークンを保存するミューテーション
  const { mutate: saveTokenToEnvVars } =
    api.oauth.saveTokenToEnvVars.useMutation({
      onSuccess: async () => {
        toast.success("OAuth認証が完了しました。");
        await utils.userMcpServerInstance.invalidate();
        // URLからパラメータをクリア
        window.history.replaceState({}, "", `/${orgSlug}/mcps`);
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
      <AsyncAvailableServersList orgSlug={orgSlug} />
    </Suspense>
  );
}
