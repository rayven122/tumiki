"use client";

import { useState, useEffect } from "react";
import { Header } from "../../_components/site/jp/Header";
import { HeroSection } from "../../_components/site/jp/HeroSection";
import { ChallengesSection } from "../../_components/site/jp/ChallengesSection";
import { SolutionSection } from "../../_components/site/jp/SolutionSection";
import { TeamExamplesSection } from "../../_components/site/jp/TeamExamplesSection";
import { CTASection } from "../../_components/site/jp/CTASection";
import { FooterSection } from "../../_components/site/jp/FooterSection";
import { WaitingListModal } from "../../_components/site/jp/WaitingListModal";
import { AboutSection } from "../../_components/site/jp/AboutSection";
import { CommunitySection } from "../../_components/site/jp/CommunitySection";

export default function HomePage() {
  const [showModal, setShowModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header setShowModal={setShowModal} />
      <div className="pt-20">
        <HeroSection setShowModal={setShowModal} isVisible={isVisible} />
      </div>
      <AboutSection />
      <ChallengesSection />
      <SolutionSection />
      <TeamExamplesSection />
      {/* <ComparisonSection /> */}
      <CommunitySection />
      <CTASection setShowModal={setShowModal} />
      <FooterSection />
      <WaitingListModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
