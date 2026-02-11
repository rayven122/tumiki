import type { EEFeature } from "@/features/ee";
import Link from "next/link";

type EEUpgradePromptProps = {
  feature: EEFeature;
};

/**
 * 機能ごとのメッセージ定義
 */
const featureMessages: Record<
  EEFeature,
  { title: string; description: string }
> = {
  "member-management": {
    title: "メンバー管理",
    description:
      "チームメンバーの招待、削除、ロール変更を行うにはEnterprise Editionが必要です。",
  },
  "role-management": {
    title: "ロール管理",
    description:
      "カスタムロールの作成、編集、削除を行うにはEnterprise Editionが必要です。",
  },
  "group-management": {
    title: "グループ管理",
    description: "組織構造の管理を行うにはEnterprise Editionが必要です。",
  },
  "organization-creation": {
    title: "組織作成",
    description: "新しい組織を作成するにはEnterprise Editionが必要です。",
  },
  "dynamic-search": {
    title: "動的ツール検索",
    description:
      "MCPツールの動的検索機能を利用するにはEnterprise Editionが必要です。",
  },
};

/**
 * EE機能が必要な場合に表示するアップグレード促進コンポーネント
 *
 * CE版でEE機能限定ページにアクセスした際に表示され、
 * ユーザーにEnterprise Editionへのアップグレードを促す。
 */
export const EEUpgradePrompt = ({ feature }: EEUpgradePromptProps) => {
  const message = featureMessages[feature];

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <svg
            className="text-primary h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-foreground mb-4 text-2xl font-bold">
          {message.title}はEnterprise Edition限定機能です
        </h2>
        <p className="text-muted-foreground mb-6">{message.description}</p>
        <Link
          href="/pricing"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-block rounded-lg px-6 py-3 font-medium transition-colors"
        >
          プランを確認する
        </Link>
      </div>
    </div>
  );
};
