import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import Footer from '@/components/public/Footer';
import Reveal from '@/components/public/Reveal';
import SectionSticker from '@/components/public/SectionSticker';
import { ArrowRight, Building2, TrendingUp, Wheat, Tractor, CreditCard, Sprout } from 'lucide-react';

const scenarios = [
  { key: 'start_farm', icon: Building2 },
  { key: 'add_livestock', icon: Tractor },
  { key: 'expand_farm', icon: TrendingUp },
  { key: 'working_capital', icon: Wheat },
] as const;

const C = {
  text1: "#2B180A",
  text2: "rgba(43,24,10,0.65)",
  dim: "rgba(43,24,10,0.35)",
  primary: "#E8730C",
  block_bg: "rgba(255,255,255,0.25)",
  block_border: "rgba(43,24,10,0.08)",
  btn_dark: "#3f2407",
} as const;

const FinanceLanding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="noise-overlay">
      
      <div className="hero-section relative">
        {/* Background image — cropped from top, pinned to bottom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('/images/finance-hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center 85%",
            backgroundRepeat: "no-repeat",
          }}
        />
        <section className="relative min-h-[50vh] md:min-h-[60vh] flex items-center justify-center px-4 pt-10 md:pt-16 pb-16">
          <div className="max-w-[1200px] mx-auto text-center relative z-[1]">
            <Reveal>
              <div className="flex justify-center mb-8">
                <SectionSticker
                  icon={
                    <svg viewBox="0 0 13 13" fill="none" className="w-full h-full">
                      <rect x="1.5" y="4" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4.5 4V3a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  }
                >
                  {t('finance.badge')}
                </SectionSticker>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="font-serif font-light text-[clamp(2.2rem,6vw,4.2rem)] leading-[1.08] tracking-editorial text-foreground mb-6">
                {t('finance.hero.title')}
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-base md:text-lg text-muted-foreground font-serif max-w-2xl mx-auto mb-10 leading-relaxed">
                {t('finance.hero.subtitle')}
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
                <Link
                  to="/finance/build"
                  className="group/btn w-full sm:w-auto text-center inline-flex items-center justify-center gap-2 px-7 py-3 text-[15px] font-medium transition-all duration-300 hover:brightness-90"
                  style={{ backgroundColor: C.btn_dark, color: "#fff", borderRadius: 13 }}
                >
                  {t('finance.heroV2.primaryCta')}
                  <span className="inline-block transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
                </Link>
                <button
                  onClick={() => {
                    document.getElementById('finance-hub')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="w-full sm:w-auto text-center px-7 py-3 text-[15px] font-medium text-foreground/70 transition-all duration-300 hover:text-foreground underline underline-offset-4 decoration-foreground/30"
                >
                  {t('finance.heroV2.secondaryCta')}
                </button>
              </div>
            </Reveal>
          </div>
        </section>
      </div>

      <main>
        {/* Hub: two pathways — Credits vs Subsidies */}
        <section id="finance-hub" className="py-10 md:py-16 scroll-mt-20" style={{ background: "#fdf6ee" }}>
          <div className="mx-auto max-w-[1200px] px-4 md:px-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Reveal>
                <Link
                  to="/finance/programs"
                  className="group block h-full rounded-[16px] p-6 md:p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: "white", border: "1px solid rgba(43,24,10,0.08)" }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(232,115,12,0.12)", color: "#E8730C" }}>
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-[22px] md:text-[26px] mb-2" style={{ color: C.text1 }}>
                    {t('financeHub.creditsTitle')}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground mb-4">
                    {t('financeHub.creditsDesc')}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "#E8730C" }}>
                    {t('financeHub.creditsCta')}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
              <Reveal delay={100}>
                <Link
                  to="/subsidies"
                  className="group block h-full rounded-[16px] p-6 md:p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: "white", border: "1px solid rgba(43,24,10,0.08)" }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(6,95,70,0.12)", color: "#065F46" }}>
                    <Sprout className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-[22px] md:text-[26px] mb-2" style={{ color: C.text1 }}>
                    {t('financeHub.subsidiesTitle')}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground mb-4">
                    {t('financeHub.subsidiesDesc')}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "#065F46" }}>
                    {t('financeHub.subsidiesCta')}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Scenarios */}
        <section className="py-12 md:py-24" style={{ background: "#fdf6ee" }}>
          <div className="mx-auto max-w-[1200px] px-4 md:px-10">
            <Reveal>
              <h2 className="font-serif font-light text-[clamp(1.55rem,5vw,2.9rem)] leading-[1.12] tracking-editorial text-center mb-10 md:mb-14 text-foreground">
                {t('finance.scenarios.title')}
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {scenarios.map(({ key, icon: Icon }, idx) => (
                <Reveal key={key} delay={idx * 80}>
                  <button
                    onClick={() => navigate(`/finance/build?goal=${key}`)}
                    className="group flex flex-col items-start sm:items-center gap-4 p-5 sm:p-6 rounded-[14px] transition-all duration-300 text-left sm:text-center w-full hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      background: C.block_bg,
                      border: `1px solid ${C.block_border}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-[10px] flex items-center justify-center transition-colors"
                      style={{ background: "rgba(43,24,10,0.06)" }}
                    >
                      <Icon size={22} strokeWidth={1.5} style={{ color: C.dim }} />
                    </div>
                    <h3
                      className="font-serif font-semibold text-[15px]"
                      style={{ color: C.text1 }}
                    >
                      {t(`finance.goals.${key}`)}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {t(`finance.goals.${key}_desc`)}
                    </p>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-12 md:py-24" style={{ background: "#fdf6ee" }}>
          <div className="mx-auto max-w-[1200px] px-4 md:px-10">
            <Reveal>
              <div
                className="rounded-[16px] md:rounded-[20px] px-5 py-8 md:px-12 md:py-16"
                style={{ background: "#f7f0e8" }}
              >
                <h2 className="font-serif font-light text-[clamp(1.55rem,5vw,2.9rem)] leading-[1.12] tracking-editorial text-center mb-10 md:mb-14 text-foreground">
                  {t('finance.how.title')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex flex-col items-center text-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-serif text-[18px]"
                        style={{
                          background: "rgba(43,24,10,0.06)",
                          color: C.text1,
                        }}
                      >
                        {step}
                      </div>
                      <h3
                        className="font-serif font-semibold text-[15px]"
                        style={{ color: C.text1 }}
                      >
                        {t(`finance.how.step${step}_title`)}
                      </h3>
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        {t(`finance.how.step${step}_desc`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FinanceLanding;
