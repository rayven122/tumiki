import { AuthHeader } from "@/app/_components/AuthHeader";
import { redirect } from "next/navigation";
import { auth } from "~/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 認証チェックのみ（オンボーディングチェックはしない）
  const session = await auth();
  if (!session?.user) {
    const returnTo = encodeURIComponent("/onboarding");
    return redirect(`/auth/login?returnTo=${returnTo}`);
  }

  return (
    <>
      <AuthHeader />
      {children}
    </>
  );
}
