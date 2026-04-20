import StartupsSectionHeader from '@/components/public/startups/StartupsSectionHeader';
import Footer from '@/components/public/Footer';
import StartupsHero from '@/components/public/startups/StartupsHero';
import StartupsCatalog from '@/components/public/startups/StartupsCatalog';

const StartupsListing = () => {
  return (
    <div className="noise-overlay">
      <StartupsSectionHeader />
      <main>
        <StartupsHero />
        <StartupsCatalog />
      </main>
      <Footer />
    </div>
  );
};

export default StartupsListing;
