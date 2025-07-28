import type { OAuthProviderConfig } from "./types";

export const githubConfig = {
  name: "GitHub",
  icon: "🐙",
  connection: "github",
  availableScopes: [
    {
      id: "repo",
      label: "リポジトリ",
      description: "リポジトリの読み書き",
      scopes: ["repo"],
    },
    {
      id: "repo-status",
      label: "コミットステータス",
      description: "コミットステータスへのアクセス",
      scopes: ["repo:status"],
    },
    {
      id: "repo-deployment",
      label: "デプロイメント",
      description: "デプロイメントステータスへのアクセス",
      scopes: ["repo_deployment"],
    },
    {
      id: "public-repo",
      label: "パブリックリポジトリ",
      description: "パブリックリポジトリへのアクセス",
      scopes: ["public_repo"],
    },
    {
      id: "repo-invite",
      label: "リポジトリ招待",
      description: "リポジトリ共同作業者の招待を受け入れ/拒否",
      scopes: ["repo:invite"],
    },
    {
      id: "gist",
      label: "Gist",
      description: "Gistの管理",
      scopes: ["gist"],
    },
    {
      id: "notifications",
      label: "通知",
      description: "通知へのアクセス",
      scopes: ["notifications"],
    },
    {
      id: "user",
      label: "ユーザープロフィール",
      description: "ユーザープロフィールの更新",
      scopes: ["user"],
    },
    {
      id: "read-user",
      label: "ユーザー情報（読み取り）",
      description: "ユーザープロフィールの読み取り",
      scopes: ["read:user"],
    },
    {
      id: "user-email",
      label: "メールアドレス",
      description: "メールアドレスへのアクセス",
      scopes: ["user:email"],
    },
    {
      id: "user-follow",
      label: "フォロー",
      description: "他のユーザーのフォロー/アンフォロー",
      scopes: ["user:follow"],
    },
    {
      id: "org",
      label: "組織（フルアクセス）",
      description: "組織の管理",
      scopes: ["admin:org"],
    },
    {
      id: "read-org",
      label: "組織（読み取り）",
      description: "組織メンバーシップとチームの読み取り",
      scopes: ["read:org"],
    },
    {
      id: "write-org",
      label: "組織（書き込み）",
      description: "組織メンバーシップの管理",
      scopes: ["write:org"],
    },
  ],
} as const satisfies OAuthProviderConfig;
