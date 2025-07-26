import type { OAuthProviderConfig } from "./types";

export const slackConfig: OAuthProviderConfig = {
  name: "Slack",
  icon: "💬",
  connection: "slack",
  availableScopes: [
    {
      id: "channels-read",
      label: "チャンネル（読み取り）",
      description: "パブリックチャンネル情報の読み取り",
      scopes: ["channels:read"],
    },
    {
      id: "channels-write",
      label: "チャンネル（書き込み）",
      description: "チャンネルの作成・管理",
      scopes: ["channels:write"],
    },
    {
      id: "channels-history",
      label: "チャンネル履歴",
      description: "パブリックチャンネルのメッセージ履歴",
      scopes: ["channels:history"],
    },
    {
      id: "groups-read",
      label: "プライベートチャンネル（読み取り）",
      description: "プライベートチャンネル情報の読み取り",
      scopes: ["groups:read"],
    },
    {
      id: "groups-write",
      label: "プライベートチャンネル（書き込み）",
      description: "プライベートチャンネルの管理",
      scopes: ["groups:write"],
    },
    {
      id: "groups-history",
      label: "プライベートチャンネル履歴",
      description: "プライベートチャンネルのメッセージ履歴",
      scopes: ["groups:history"],
    },
    {
      id: "chat-write",
      label: "メッセージ送信",
      description: "メッセージの送信",
      scopes: ["chat:write"],
    },
    {
      id: "chat-write-user",
      label: "ユーザーとしてメッセージ送信",
      description: "ユーザーとしてメッセージを送信",
      scopes: ["chat:write:user"],
    },
    {
      id: "chat-write-bot",
      label: "ボットとしてメッセージ送信",
      description: "ボットとしてメッセージを送信",
      scopes: ["chat:write:bot"],
    },
    {
      id: "im-read",
      label: "ダイレクトメッセージ（読み取り）",
      description: "ダイレクトメッセージの読み取り",
      scopes: ["im:read"],
    },
    {
      id: "im-write",
      label: "ダイレクトメッセージ（書き込み）",
      description: "ダイレクトメッセージの送信",
      scopes: ["im:write"],
    },
    {
      id: "im-history",
      label: "ダイレクトメッセージ履歴",
      description: "ダイレクトメッセージの履歴",
      scopes: ["im:history"],
    },
    {
      id: "users-read",
      label: "ユーザー情報（読み取り）",
      description: "ユーザー情報の読み取り",
      scopes: ["users:read"],
    },
    {
      id: "users-read-email",
      label: "ユーザーメール（読み取り）",
      description: "ユーザーのメールアドレスの読み取り",
      scopes: ["users:read.email"],
    },
    {
      id: "team-read",
      label: "チーム情報（読み取り）",
      description: "ワークスペース情報の読み取り",
      scopes: ["team:read"],
    },
    {
      id: "files-read",
      label: "ファイル（読み取り）",
      description: "ファイルの読み取り",
      scopes: ["files:read"],
    },
    {
      id: "files-write",
      label: "ファイル（書き込み）",
      description: "ファイルのアップロード・編集",
      scopes: ["files:write"],
    },
  ],
};
