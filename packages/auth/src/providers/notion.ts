import type { OAuthProviderConfig } from "./types";

export const notionConfig = {
  name: "Notion",
  icon: "📝",
  connection: "notion",
  availableScopes: [
    {
      id: "read-content",
      label: "コンテンツ読み取り",
      description: "ページとデータベースの読み取り",
      scopes: ["read_content"],
    },
    {
      id: "insert-content",
      label: "コンテンツ挿入",
      description: "新しいページとデータベースの作成",
      scopes: ["insert_content"],
    },
    {
      id: "update-content",
      label: "コンテンツ更新",
      description: "既存のページとデータベースの編集",
      scopes: ["update_content"],
    },
    {
      id: "delete-content",
      label: "コンテンツ削除",
      description: "ページとデータベースの削除",
      scopes: ["delete_content"],
    },
  ],
} as const satisfies OAuthProviderConfig;
