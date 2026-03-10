"use client";

import Link from "next/link";
import { Button } from "@tumiki/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { ChevronLeft, Plus, Workflow } from "lucide-react";

type CreateMcpServerPageClientProps = {
  orgSlug: string;
};

/**
 * MCPサーバー作成選択ページのクライアントコンポーネント
 */
export const CreateMcpServerPageClient = ({
  orgSlug,
}: CreateMcpServerPageClientProps) => {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/${orgSlug}/mcps`}>
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">MCPサーバーを作成</h1>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          作成方法を選択してください
        </p>
      </div>

      {/* 選択カード */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 既存サーバーを追加 */}
        <Link href={`/${orgSlug}/mcps/add`}>
          <Card className="cursor-pointer transition-all hover:border-blue-500 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">既存サーバーを追加</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                公式テンプレートやカスタムMCPサーバーを追加します。
              </p>
              <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>公式MCPサーバーテンプレートから選択</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>カスタムコマンドでMCPサーバーを追加</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>認証設定（API Key、OAuth）</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>

        {/* 統合サーバーを作成 */}
        <Link href={`/${orgSlug}/mcps/create-integrated`}>
          <Card className="cursor-pointer transition-all hover:border-purple-500 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <Workflow className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">統合サーバーを作成</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                既存サーバーで設定を完了したものを統合して、1つのサーバーとして利用できます。
              </p>
              <div className="mt-3 rounded-md border border-purple-200 bg-purple-50 p-3">
                <p className="text-xs text-purple-900">
                  💡
                  既に「既存サーバーを追加」で追加済みのサーバーを複数選択して統合することで、複数のツールを1つのサーバーで利用できるようになります。
                </p>
              </div>
              <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>追加済みサーバーから複数選択（最低2つ）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>各サーバーのツールを個別に有効化</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>統合サーバーの名前・説明を設定</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};
