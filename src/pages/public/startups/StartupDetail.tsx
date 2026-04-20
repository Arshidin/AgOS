import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import StartupsSectionHeader from '@/components/public/startups/StartupsSectionHeader';
import Footer from '@/components/public/Footer';
import StartupDetailContent from '@/components/public/startups/StartupDetailContent';

const StartupDetail = () => {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  return (
    <div className="noise-overlay">
      <StartupsSectionHeader />
      <main style={{ background: '#fdf6ee', minHeight: '100vh' }}>
        <StartupDetailContent slug={slug ?? ''} />
      </main>
      <Footer />
    </div>
  );
};

export default StartupDetail;
