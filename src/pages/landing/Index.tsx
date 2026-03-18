import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ValueProposition from "@/components/landing/ValueProposition";
import TrustedBy from "@/components/landing/TrustedBy";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="noise-overlay">
      <div className="hero-section">
        <Navbar />
        <Hero />
      </div>
      <main>
        <ValueProposition />
        <TrustedBy />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
