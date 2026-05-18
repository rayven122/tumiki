import React from "react";
import type { McpCatalogItem } from "../constants/mcpCatalog";
import { Server, Wrench } from "lucide-react";

type CatalogCardProps = {
  item: McpCatalogItem;
};

export const CatalogCard = ({ item }: CatalogCardProps): React.ReactElement => {
  const handleRegister = (): void => {
    // TODO: MCP登録処理
  };

  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* バッジエリア（右上） */}
      <div className="relative">
        <div className="absolute top-3 right-3 z-10">
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              item.authType === "API_KEY"
                ? "bg-amber-100 text-amber-800"
                : item.authType === "OAUTH"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
            }`}
          >
            {item.authType === "API_KEY"
              ? "API Key"
              : item.authType === "OAUTH"
                ? "OAuth"
                : "設定不要"}
          </span>
        </div>
      </div>

      {/* ヘッダー: アイコン + 名前 */}
      <div className="flex items-center space-x-2 px-6 pt-6 pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100">
          <Server className="h-5 w-5 text-gray-600" />
        </div>
        <div className="min-w-0 flex-1 pr-16">
          <h3 className="truncate text-base font-semibold text-gray-900">
            {item.name}
          </h3>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex flex-1 flex-col space-y-3 px-6 py-3">
        {/* ツール数ボタン */}
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
        >
          <span className="flex items-center text-gray-700">
            <Wrench className="mr-2 h-4 w-4" />
            利用可能なツール
          </span>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            認証後に表示
          </span>
        </button>

        {/* 説明 */}
        <p className="text-sm leading-relaxed text-gray-600">
          {item.description}
        </p>

        {/* カテゴリータグ */}
        <div className="flex flex-wrap gap-1 pt-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-purple-700 px-2 py-1 text-xs font-medium text-white"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* フッター: 追加ボタン */}
      <div className="mt-auto px-6 pb-6">
        <button
          type="button"
          onClick={handleRegister}
          className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          追加
        </button>
      </div>
    </div>
  );
};
