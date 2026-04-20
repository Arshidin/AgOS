import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import Footer from '@/components/public/Footer';
import Reveal from '@/components/public/Reveal';
import { ArrowRight, Beef, Wheat, Factory, Droplets } from 'lucide-react';
import type { SubsidyCategory } from '@/types/subsidy';
import { useSubsidyCategoryCounts } from '@/hooks/subsidies/useSubsidyPrograms';

const CATEGORIES: Array<{ key: SubsidyCategory; icon: typeof Beef; accent: string }> = [
  { key: 'livestock', icon: Beef, accent: '#8B3A1A' },
  { key: 'crop', icon: Wheat, accent: '#7B6416' },
  { key: 'investment', icon: Factory, accent: '#1A3D22' },
  { key: 'irrigation', icon: Droplets, accent: '#1A4166' },
];

export default function SubsidiesLanding() {
  const { t } = useTranslation();
  const { data: counts } = useSubsidyCategoryCounts();

  return (
    <div className="min-h-screen bg-[#fdf6ee] noise-overlay">
      <Helmet>
        <title>{t('subsidies.hero.title')}</title>
      </Helmet>

      

      {/* Hero */}
      <section className="pt-10 md:pt-16 pb-12 md:pb-20 px-4">
        <div className="max-w-[1200px] mx-auto text-center">
          <Reveal>
            <div className="inline-block px-4 py-1.5 mb-6 rounded-full border border-[#2B180A]/10 bg-white/50 text-sm text-[#2B180A]/70 font-medium">
              {t('subsidies.hero.badge')}
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-serif text-[clamp(28px,5vw,56px)] leading-tight text-[#2B180A] font-bold mb-5 max-w-[900px] mx-auto">
              {t('subsidies.hero.title')}
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-lg md:text-xl text-[#2B180A]/70 max-w-[680px] mx-auto mb-10">
              {t('subsidies.hero.subtitle')}
            </p>
          </Reveal>
          <Reveal delay={300}>
            <Link
              to="/subsidies/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#E8730C] text-white font-semibold hover:bg-[#d0660a] transition-colors"
            >
              {t('subsidies.hero.ctaCatalog')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 4 category tiles */}
      <section className="px-4 pb-16 md:pb-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {CATEGORIES.map((c, i) => {
              const Icon = c.icon;
              const count = counts?.[c.key] ?? 0;
              return (
                <Reveal key={c.key} delay={i * 80}>
                  <Link
                    to={`/subsidies/catalog?category=${c.key}`}
                    className="group block h-full bg-white rounded-2xl p-6 border border-[#2B180A]/10 hover:border-[#E8730C]/40 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${c.accent}14`, color: c.accent }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-[#2B180A] mb-2">
                      {t(`subsidies.categories.${c.key}`)}
                    </h3>
                    <p className="text-sm text-[#2B180A]/65 mb-4 min-h-[2.5em]">
                      {t(`subsidies.categories.${c.key}Desc`)}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#2B180A]/50">
                        {t('subsidies.categories.count', { count })}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#E8730C] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
