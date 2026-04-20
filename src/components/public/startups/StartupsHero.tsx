import { useTranslation } from 'react-i18next';
import Reveal from '@/components/public/Reveal';
import SectionSticker from '@/components/public/SectionSticker';
import { useStartupMetrics } from '@/hooks/startups/useStartupMetrics';
import { formatCurrency } from '@/lib/formatCurrency';

export default function StartupsHero() {
  const { t } = useTranslation();
  const { data: metrics } = useStartupMetrics();

  return (
    <section className="pt-28 md:pt-36 pb-12 md:pb-16" style={{ background: '#fdf6ee' }}>
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <div className="max-w-[700px] md:mx-auto md:text-center">
          <SectionSticker
            icon={
              <svg viewBox="0 0 18 18" fill="none" className="w-full h-full">
                <path d="M9 2l2.2 4.4L16 7.2l-3.5 3.4.8 4.9L9 13.2 4.7 15.5l.8-4.9L2 7.2l4.8-.8L9 2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
            {t('startups.hero.sticker')}
          </SectionSticker>

          <Reveal delay={100}>
            <h1 className="font-serif font-light text-[clamp(1.55rem,5vw,2.9rem)] leading-[1.12] tracking-editorial text-foreground">
              {t('startups.hero.title')}
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-2 md:mt-4 text-[13px] md:text-[16px] leading-relaxed text-muted-foreground">
              {t('startups.hero.subtitle')}
            </p>
          </Reveal>

        </div>

        {/* Metrics */}
        {metrics && (metrics.totalProjects > 0) && (
          <Reveal delay={300}>
            <div
              className="mt-8 md:mt-12 flex items-center justify-center gap-8 md:gap-16"
            >
              <div className="text-center">
                <div className="text-[28px] md:text-[36px] font-serif font-semibold" style={{ color: '#2B180A' }}>
                  {metrics.totalProjects}
                </div>
                <div className="text-[12px] md:text-[13px]" style={{ color: 'rgba(43,24,10,0.5)' }}>
                  {t('startups.hero.metricProjects')}
                </div>
              </div>

              <div className="w-px h-10" style={{ background: 'rgba(43,24,10,0.1)' }} />

              <div className="text-center">
                <div className="text-[28px] md:text-[36px] font-serif font-semibold" style={{ color: '#E8730C' }}>
                  {formatCurrency(metrics.totalRaised)}
                </div>
                <div className="text-[12px] md:text-[13px]" style={{ color: 'rgba(43,24,10,0.5)' }}>
                  {t('startups.hero.metricRaised')}
                </div>
              </div>

              <div className="w-px h-10" style={{ background: 'rgba(43,24,10,0.1)' }} />

              <div className="text-center">
                <div className="text-[28px] md:text-[36px] font-serif font-semibold" style={{ color: '#2B180A' }}>
                  {metrics.totalSectors}
                </div>
                <div className="text-[12px] md:text-[13px]" style={{ color: 'rgba(43,24,10,0.5)' }}>
                  {t('startups.hero.metricSectors')}
                </div>
              </div>
            </div>
          </Reveal>
        )}
      </div>

    </section>
  );
}
