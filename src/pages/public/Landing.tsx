import Navbar from "@/components/public/Navbar";
import Hero from "@/components/public/Hero";
import ValueProposition from "@/components/public/ValueProposition";
import TrustedBy from "@/components/public/TrustedBy";
import FinancePrograms from "@/components/public/FinancePrograms";
import LatestNews from "@/components/public/LatestNews";
import CTASection from "@/components/public/CTASection";
import Footer from "@/components/public/Footer";

const Landing = () => {
  return (
    <div className="noise-overlay">
      <div className="hero-section">
        <Navbar />
        <Hero />
      </div>
      <main>
        <ValueProposition />
        <TrustedBy />
        <FinancePrograms />
        <LatestNews />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
