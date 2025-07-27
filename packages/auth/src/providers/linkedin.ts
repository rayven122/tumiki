import type { OAuthProviderConfig } from "./types";

export const linkedinConfig: OAuthProviderConfig = {
  name: "LinkedIn",
  icon: "💼",
  connection: "linkedin",
  availableScopes: [
    {
      id: "profile",
      label: "プロフィール（基本）",
      description: "基本的なプロフィール情報",
      scopes: ["r_liteprofile"], // cspell:disable-line
    },
    {
      id: "email",
      label: "メールアドレス",
      description: "メールアドレスへのアクセス",
      scopes: ["r_emailaddress"], // cspell:disable-line
    },
    {
      id: "share",
      label: "投稿の作成",
      description: "LinkedIn上での投稿の作成",
      scopes: ["w_member_social"],
    },
  ],
};
