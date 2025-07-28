import type { OAuthProviderConfig } from "./types";

export const googleConfig = {
  name: "Google",
  icon: "🔍",
  connection: "google-oauth2",
  availableScopes: [
    {
      id: "drive-read",
      label: "Google Drive（読み取り）",
      description: "ファイルの閲覧・検索",
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      category: "ドライブ",
    },
    {
      id: "drive-write",
      label: "Google Drive（書き込み）",
      description: "ファイルの作成・編集・削除",
      scopes: ["https://www.googleapis.com/auth/drive.file"],
      category: "ドライブ",
    },
    {
      id: "drive-full",
      label: "Google Drive（フルアクセス）",
      description: "すべてのドライブ機能へのアクセス",
      scopes: ["https://www.googleapis.com/auth/drive"],
      category: "ドライブ",
    },
    {
      id: "calendar",
      label: "カレンダー",
      description: "カレンダーイベントの管理",
      scopes: ["https://www.googleapis.com/auth/calendar"],
      category: "カレンダー",
    },
    {
      id: "calendar-readonly",
      label: "カレンダー（読み取り）",
      description: "カレンダーの閲覧のみ",
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      category: "カレンダー",
    },
    {
      id: "gmail-readonly",
      label: "Gmail（読み取り）",
      description: "メールの読み取り",
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      category: "メール",
    },
    {
      id: "gmail-compose",
      label: "Gmail（作成）",
      description: "メールの作成・送信",
      scopes: ["https://www.googleapis.com/auth/gmail.compose"],
      category: "メール",
    },
    {
      id: "gmail-modify",
      label: "Gmail（編集）",
      description: "メールの編集・削除",
      scopes: ["https://www.googleapis.com/auth/gmail.modify"],
      category: "メール",
    },
    {
      id: "tasks",
      label: "タスク",
      description: "Google Tasksの管理",
      scopes: ["https://www.googleapis.com/auth/tasks"],
      category: "その他",
    },
    {
      id: "userinfo",
      label: "ユーザー情報",
      description: "基本的なプロフィール情報",
      scopes: ["https://www.googleapis.com/auth/userinfo.profile"],
      category: "その他",
    },
  ],
} as const satisfies OAuthProviderConfig;
