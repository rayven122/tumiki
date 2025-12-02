import { OnboardingClient } from "./_components/OnboardingClient";
import { auth } from "~/auth";

type OnboardingPageProps = {
  searchParams: Promise<{ first?: string }>;
};

const OnboardingPage = async ({ searchParams }: OnboardingPageProps) => {
  const session = await auth();
  const params = await searchParams;
  const isFirstLogin = params.first === "true";

  return <OnboardingClient session={session} isFirstLogin={isFirstLogin} />;
};

export default OnboardingPage;
