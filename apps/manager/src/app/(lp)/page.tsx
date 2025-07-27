"use client";

import { useState, useEffect } from "react";
import { Header } from "../_components/site/en/Header";
import { HeroSection } from "../_components/site/en/HeroSection";
import { AboutSection } from "../_components/site/en/AboutSection";
import { CommunitySection } from "../_components/site/en/CommunitySection";
import { FooterCTASection } from "../_components/site/en/FooterCTASection";
import { FooterSection } from "../_components/site/en/FooterSection";
import { WaitingListModal } from "../_components/site/en/WaitingListModal";

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
      <CommunitySection />
      <FooterCTASection setShowModal={setShowModal} />
      <FooterSection />
      <WaitingListModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
