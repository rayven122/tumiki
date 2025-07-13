"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/trpc/react";

interface OnboardingCheckProps {
  children: React.ReactNode;
}

export const OnboardingCheck = ({ children }: OnboardingCheckProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const { data: onboardingStatus, isLoading } =
    api.user.checkOnboardingStatus.useQuery();

  useEffect(() => {
    // ローディング中は何もしない
    if (isLoading) return;

    // オンボーディングページにいる場合は何もしない
    if (pathname === "/onboarding") return;

    // ランディングページにいる場合は何もしない
    if (pathname === "/" || pathname === "/jp") return;

    // オンボーディングが完了していない場合はオンボーディングページにリダイレクト
    if (onboardingStatus && !onboardingStatus.isOnboardingCompleted) {
      router.push("/onboarding");
    }
  }, [onboardingStatus, isLoading, pathname, router]);

  // ローディング中は子要素を表示
  if (isLoading) {
    return <>{children}</>;
  }

  // オンボーディング完了または適切なページにいる場合は子要素を表示
  if (
    pathname === "/onboarding" ||
    pathname === "/" ||
    pathname === "/jp" ||
    onboardingStatus?.isOnboardingCompleted
  ) {
    return <>{children}</>;
  }

  // オンボーディング未完了でオンボーディングページ以外にいる場合は何も表示しない
  // （リダイレクト処理中）
  return null;
};
