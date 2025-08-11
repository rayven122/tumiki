import { Header } from "@/app/_components/Header";
import { redirect } from "next/navigation";
import { auth } from "@tumiki/auth/server";

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
      <Header />
      {children}
    </>
  );
}
