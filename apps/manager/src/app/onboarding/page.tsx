import { api } from "@/trpc/server";
import { OnboardingClient } from "./_components/OnboardingClient";

const OnboardingPage = async () => {
  // サーバーサイドで組織一覧を取得
  let isFirstLogin = false;

  try {
    const organizations = await api.organization.getUserOrganizations();
    isFirstLogin = organizations.length === 0;
  } catch {
    // エラーの場合は初回ログインとして扱う
    isFirstLogin = true;
  }

  return <OnboardingClient isFirstLogin={isFirstLogin} />;
};

export default OnboardingPage;
