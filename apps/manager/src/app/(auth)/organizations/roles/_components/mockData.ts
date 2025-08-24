import type { TeamMember, MCPServer } from "./types";

export const mockTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "田中 太郎",
    email: "tanaka@example.com",
    role: "admin",
    department: "経営企画部",
    joinedAt: "2023-01-15",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    status: "active",
    lastLogin: "2分前",
  },
  {
    id: "2",
    name: "佐藤 花子",
    email: "sato@example.com",
    role: "editor",
    department: "マーケティング部",
    joinedAt: "2023-03-20",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    status: "active",
    lastLogin: "1時間前",
  },
  {
    id: "3",
    name: "鈴木 一郎",
    email: "suzuki@example.com",
    role: "viewer",
    department: "営業部",
    joinedAt: "2023-06-10",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    status: "active",
    lastLogin: "3日前",
  },
  {
    id: "4",
    name: "高橋 美咲",
    email: "takahashi@example.com",
    role: "editor",
    department: "開発部",
    joinedAt: "2023-08-05",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    status: "invited",
    invitedBy: "田中 太郎",
  },
  {
    id: "5",
    name: "山田 健太",
    email: "yamada@example.com",
    role: "viewer",
    department: "カスタマーサポート部",
    joinedAt: "2023-11-12",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    status: "inactive",
    lastLogin: "30日前",
  },
];

export const roleLabels: Record<string, string> = {
  admin: "管理者",
  editor: "編集者",
  viewer: "閲覧者",
};

export const mockMCPServers: MCPServer[] = [
  {
    id: "1",
    name: "GitHub API",
    description: "GitHubリポジトリへのアクセス",
    logo: "/logos/github.svg",
    tools: [
      {
        id: "1-1",
        name: "create_repository",
        description: "新しいリポジトリを作成",
      },
      {
        id: "1-2",
        name: "get_repository",
        description: "リポジトリ情報を取得",
      },
      { id: "1-3", name: "list_issues", description: "Issueの一覧を取得" },
      { id: "1-4", name: "create_issue", description: "新しいIssueを作成" },
      {
        id: "1-5",
        name: "create_pull_request",
        description: "プルリクエストを作成",
      },
      {
        id: "1-6",
        name: "merge_pull_request",
        description: "プルリクエストをマージ",
      },
    ],
  },
  {
    id: "2",
    name: "Slack Integration",
    description: "Slack通知とメッセージング",
    logo: "/logos/slack.svg",
    tools: [
      {
        id: "2-1",
        name: "send_message",
        description: "チャンネルにメッセージを送信",
      },
      {
        id: "2-2",
        name: "send_direct_message",
        description: "ダイレクトメッセージを送信",
      },
      { id: "2-3", name: "list_channels", description: "チャンネル一覧を取得" },
      {
        id: "2-4",
        name: "create_channel",
        description: "新しいチャンネルを作成",
      },
      { id: "2-5", name: "upload_file", description: "ファイルをアップロード" },
    ],
  },
  {
    id: "3",
    name: "PostgreSQL",
    description: "データベースへの読み書き",
    logo: "/logos/postgresql.svg",
    tools: [
      { id: "3-1", name: "execute_query", description: "SQLクエリを実行" },
      { id: "3-2", name: "create_table", description: "新しいテーブルを作成" },
      { id: "3-3", name: "insert_data", description: "データを挿入" },
      { id: "3-4", name: "update_data", description: "データを更新" },
      { id: "3-5", name: "delete_data", description: "データを削除" },
      {
        id: "3-6",
        name: "backup_database",
        description: "データベースをバックアップ",
      },
    ],
  },
  {
    id: "4",
    name: "Google Drive",
    description: "ファイルストレージアクセス",
    logo: "/logos/google-drive.svg",
    tools: [
      { id: "4-1", name: "list_files", description: "ファイル一覧を取得" },
      { id: "4-2", name: "upload_file", description: "ファイルをアップロード" },
      {
        id: "4-3",
        name: "download_file",
        description: "ファイルをダウンロード",
      },
      { id: "4-4", name: "delete_file", description: "ファイルを削除" },
      { id: "4-5", name: "share_file", description: "ファイルを共有" },
      { id: "4-6", name: "create_folder", description: "フォルダを作成" },
    ],
  },
  {
    id: "5",
    name: "Docker",
    description: "コンテナ管理とデプロイ",
    logo: "/logos/docker.svg",
    tools: [
      { id: "5-1", name: "list_containers", description: "コンテナ一覧を取得" },
      { id: "5-2", name: "start_container", description: "コンテナを開始" },
      { id: "5-3", name: "stop_container", description: "コンテナを停止" },
      { id: "5-4", name: "build_image", description: "イメージをビルド" },
      { id: "5-5", name: "deploy_service", description: "サービスをデプロイ" },
      { id: "5-6", name: "view_logs", description: "ログを表示" },
    ],
  },
];

export const defaultMCPsByRole: Record<string, string[]> = {
  admin: ["1", "2", "3", "4", "5"],
  editor: ["1", "2", "4"],
  viewer: ["2"],
};
