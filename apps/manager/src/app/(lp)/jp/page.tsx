"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "../../_components/site/jp/Header";
import { HeroSection } from "../../_components/site/jp/HeroSection";
import { ChallengesSection } from "../../_components/site/jp/ChallengesSection";
import { SolutionSection } from "../../_components/site/jp/SolutionSection";
import { TeamExamplesSection } from "../../_components/site/jp/TeamExamplesSection";
import { CTASection } from "../../_components/site/jp/CTASection";
import { FooterSection } from "../../_components/site/jp/FooterSection";
import { AboutSection } from "../../_components/site/jp/AboutSection";
import { CommunitySection } from "../../_components/site/jp/CommunitySection";

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    // セッションが存在し、デフォルト組織がある場合はリダイレクト
    if (
      status === "authenticated" &&
      session?.user?.defaultOrganization?.slug
    ) {
      router.push(`/${session.user.defaultOrganization.slug}/mcps`);
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20">
        <HeroSection isVisible={isVisible} />
      </div>
      <AboutSection />
      <ChallengesSection />
      <SolutionSection />
      <TeamExamplesSection />
      {/* <ComparisonSection /> */}
      <CommunitySection />
      <CTASection />
      <FooterSection />
    </div>
  );
}
