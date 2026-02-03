"use client";

import { useState, useEffect } from "react";
import { Header } from "../_components/site/en/Header";
import { HeroSection } from "../_components/site/en/HeroSection";
import { AboutSection } from "../_components/site/en/AboutSection";
import { ChallengesSection } from "../_components/site/en/ChallengesSection";
import { SolutionSection } from "../_components/site/en/SolutionSection";
import { TeamExamplesSection } from "../_components/site/en/TeamExamplesSection";
import { CommunitySection } from "../_components/site/en/CommunitySection";
import { CTASection } from "../_components/site/en/CTASection";
import { FooterSection } from "../_components/site/en/FooterSection";

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
      <CommunitySection />
      <CTASection />
      <FooterSection />
    </div>
  );
}
