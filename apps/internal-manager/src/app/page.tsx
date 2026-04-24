import AgentBuilderSection from "./_components/lp/AgentBuilderSection";
import CtaSection from "./_components/lp/CtaSection";
import FeaturesSection from "./_components/lp/FeaturesSection";
import Footer from "./_components/lp/Footer";
import Header from "./_components/lp/Header";
import HeroSection from "./_components/lp/HeroSection";
import LogoBarSection from "./_components/lp/LogoBarSection";
import PillarsSection from "./_components/lp/PillarsSection";
import ProblemSection from "./_components/lp/ProblemSection";
import SolutionSection from "./_components/lp/SolutionSection";
import TrustSection from "./_components/lp/TrustSection";

const HomePage = () => {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <LogoBarSection />
        <ProblemSection />
        <PillarsSection />
        <FeaturesSection />
        <AgentBuilderSection />
        <TrustSection />
        <SolutionSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
