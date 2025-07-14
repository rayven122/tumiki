"use client";

import { useState, useEffect } from "react";
import { HeroSection } from "../../_components/site/jp/HeroSection";
import { ChallengesSection } from "../../_components/site/jp/ChallengesSection";
import { SolutionSection } from "../../_components/site/jp/SolutionSection";
import { TeamExamplesSection } from "../../_components/site/jp/TeamExamplesSection";
import { CTASection } from "../../_components/site/jp/CTASection";
import { FooterSection } from "../../_components/site/jp/FooterSection";
import { WaitingListModal } from "../../_components/site/jp/WaitingListModal";
import { AboutSection } from "../../_components/site/jp/AboutSection";

export default function HomePage() {
  const [showModal, setShowModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <HeroSection setShowModal={setShowModal} isVisible={isVisible} />
      <AboutSection />
      <ChallengesSection />
      <SolutionSection />
      <TeamExamplesSection />
      {/* <ComparisonSection /> */}
      <CTASection setShowModal={setShowModal} />
      <FooterSection />
      <WaitingListModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
