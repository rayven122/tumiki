import { Header } from "@/app/_components/Header";
import { OnboardingCheck } from "@/components/OnboardingCheck";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <OnboardingCheck>{children}</OnboardingCheck>
    </>
  );
}
