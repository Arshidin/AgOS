import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ValueProposition from "@/components/ValueProposition";
import TrustedBy from "@/components/TrustedBy";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

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
