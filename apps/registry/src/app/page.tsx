import CtaSection from "./_components/lp/CtaSection";
import FeaturesSection from "./_components/lp/FeaturesSection";
import Footer from "./_components/lp/Footer";
import Header from "./_components/lp/Header";
import HeroSection from "./_components/lp/HeroSection";
import LogoBarSection from "./_components/lp/LogoBarSection";
import PillarsSection from "./_components/lp/PillarsSection";
import ProblemSection from "./_components/lp/ProblemSection";
import ShowcaseSection from "./_components/lp/ShowcaseSection";
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
        <ShowcaseSection />
        <TrustSection />
        <SolutionSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
