"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "../_components/site/en/Header";
import { HeroSection } from "../_components/site/en/HeroSection";
import { AboutSection } from "../_components/site/en/AboutSection";
import { CommunitySection } from "../_components/site/en/CommunitySection";
import { FooterCTASection } from "../_components/site/en/FooterCTASection";
import { FooterSection } from "../_components/site/en/FooterSection";

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
      <CommunitySection />
      <FooterCTASection />
      <FooterSection />
    </div>
  );
}
