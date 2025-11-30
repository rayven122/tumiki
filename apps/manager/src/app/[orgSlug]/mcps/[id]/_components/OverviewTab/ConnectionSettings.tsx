"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server } from "lucide-react";
import type { UserMcpServerDetail } from "../types";

type ConnectionSettingsProps = {
  server: UserMcpServerDetail;
};

export const ConnectionSettings = ({ server }: ConnectionSettingsProps) => {
  return (
    <div className="space-y-4 lg:col-span-2">
      <h3 className="text-lg font-semibold">接続設定</h3>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">サーバー情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="flex items-start space-x-2">
              <Server className="mt-0.5 h-4 w-4 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">サーバーID</p>
                <p className="mt-1 overflow-x-auto text-xs text-gray-600">
                  {server.id}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="flex items-start space-x-2">
              <Server className="mt-0.5 h-4 w-4 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">
                  サーバータイプ
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {server.serverType === "OFFICIAL" ? "公式" : "カスタム"}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="flex items-start space-x-2">
              <Server className="mt-0.5 h-4 w-4 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">認証タイプ</p>
                <p className="mt-1 text-xs text-gray-600">
                  {server.authType === "NONE"
                    ? "認証なし"
                    : server.authType === "API_KEY"
                      ? "APIキー"
                      : "OAuth"}
                </p>
              </div>
            </div>
          </div>
          {server.mcpServer?.url && (
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="flex items-start space-x-2">
                <Server className="mt-0.5 h-4 w-4 text-gray-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">URL</p>
                  <p className="mt-1 overflow-x-auto text-xs text-gray-600">
                    {server.mcpServer.url}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
