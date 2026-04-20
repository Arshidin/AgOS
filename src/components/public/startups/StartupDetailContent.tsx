import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Globe,
  Mail,
  FileText,
  Play,
  ExternalLink,
  Users,
  Calendar,
  MapPin,
  Plus,
} from 'lucide-react';
import Reveal from '@/components/public/Reveal';
import { Skeleton } from '@/components/ui/skeleton';
import { useStartup } from '@/hooks/startups/useStartup';
import { formatCurrency } from '@/lib/formatCurrency';
import StartupCategoryBadge from './StartupCategoryBadge';
import StartupStageBadge from './StartupStageBadge';
import FundingStatusBadge from './FundingStatusBadge';
import SubmitStartupModal from './submit/SubmitStartupModal';

const C = {
  text1: '#2B180A',
  text2: 'rgba(43,24,10,0.65)',
  dim: 'rgba(43,24,10,0.35)',
  blockBg: 'rgba(255,255,255,0.25)',
  blockBorder: 'rgba(43,24,10,0.08)',
  accent: '#E8730C',
};

function SectionBlock({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[14px] px-5 py-4 ${className}`}
      style={{ background: C.blockBg, border: `1px solid ${C.blockBorder}` }}
    >
      {children}
    </div>
  );
}

export default function StartupDetailContent({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const { data: startup, isLoading, isError } = useStartup(slug);
  const [submitOpen, setSubmitOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[900px] px-5 md:px-10 pt-28 md:pt-36 pb-16">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-[300px] w-full rounded-2xl mb-6" />
        <Skeleton className="h-6 w-1/2 mb-3" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (isError || !startup) {
    return (
      <div className="mx-auto max-w-[900px] px-5 md:px-10 pt-28 md:pt-36 pb-16 text-center">
        <p className="text-muted-foreground mb-4">{t('startups.detail.notFound')}</p>
        <Link
          to="/startups"
          className="text-sm font-medium underline underline-offset-4"
          style={{ color: C.accent }}
        >
          {t('startups.detail.backToList')}
        </Link>
      </div>
    );
  }

  const fundingPercent =
    startup.funding_ask && startup.funding_raised
      ? Math.min(100, Math.round((startup.funding_raised / startup.funding_ask) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-[900px] px-5 md:px-10 pt-28 md:pt-36 pb-16">
      {/* Back link */}
      <Reveal delay={0}>
        <Link
          to="/startups"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-opacity hover:opacity-70"
          style={{ color: C.dim }}
        >
          <ArrowLeft size={16} />
          {t('startups.detail.backToList')}
        </Link>
      </Reveal>

      {/* Cover image */}
      {startup.cover_image_url && (
        <Reveal delay={50}>
          <div className="rounded-[16px] overflow-hidden mb-8">
            <img
              src={startup.cover_image_url}
              alt={startup.title}
              className="w-full aspect-[2/1] object-cover"
            />
          </div>
        </Reveal>
      )}

      {/* Header */}
      <Reveal delay={100}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StartupCategoryBadge category={startup.category} />
          <StartupStageBadge stage={startup.stage} />
          <FundingStatusBadge status={startup.funding_status} />
        </div>

        <h1
          className="font-serif font-semibold text-[clamp(1.5rem,4vw,2.25rem)] leading-[1.15] mb-2"
          style={{ color: C.text1 }}
        >
          {startup.title}
        </h1>

        {startup.tagline && (
          <p className="text-[15px] md:text-[17px] leading-relaxed mb-4" style={{ color: C.text2 }}>
            {startup.tagline}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-[13px] mb-8" style={{ color: C.dim }}>
          {startup.location_region && (
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {t(`constants.regions.${startup.location_region}`, { defaultValue: startup.location_region })}
            </span>
          )}
          {startup.year_founded && (
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {t('startups.detail.founded', { year: startup.year_founded })}
            </span>
          )}
          {startup.team_size && (
            <span className="flex items-center gap-1">
              <Users size={14} />
              {t('startups.detail.teamSize', { count: startup.team_size })}
            </span>
          )}
        </div>
      </Reveal>

      {/* About */}
      {(startup.description_problem || startup.description_solution) && (
        <Reveal delay={150}>
          <SectionBlock className="mb-6">
            <h2 className="font-serif font-semibold text-[18px] mb-3" style={{ color: C.text1 }}>
              {t('startups.detail.about')}
            </h2>

            {startup.description_problem && (
              <div className="mb-4">
                <h3 className="text-[13px] font-medium mb-1" style={{ color: C.dim }}>
                  {t('startups.detail.problem')}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: C.text2 }}>
                  {startup.description_problem}
                </p>
              </div>
            )}

            {startup.description_solution && (
              <div className="mb-4">
                <h3 className="text-[13px] font-medium mb-1" style={{ color: C.dim }}>
                  {t('startups.detail.solution')}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: C.text2 }}>
                  {startup.description_solution}
                </p>
              </div>
            )}

            {startup.target_market && (
              <div className="mb-4">
                <h3 className="text-[13px] font-medium mb-1" style={{ color: C.dim }}>
                  {t('startups.detail.targetMarket')}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: C.text2 }}>
                  {startup.target_market}
                </p>
              </div>
            )}

            {startup.business_model && (
              <div>
                <h3 className="text-[13px] font-medium mb-1" style={{ color: C.dim }}>
                  {t('startups.detail.businessModel')}
                </h3>
                <p className="text-[14px] leading-relaxed" style={{ color: C.text2 }}>
                  {startup.business_model}
                </p>
              </div>
            )}
          </SectionBlock>
        </Reveal>
      )}

      {/* Team */}
      {startup.team_members.length > 0 && (
        <Reveal delay={200}>
          <SectionBlock className="mb-6">
            <h2 className="font-serif font-semibold text-[18px] mb-4" style={{ color: C.text1 }}>
              {t('startups.detail.team')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {startup.team_members.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  {m.photo_url ? (
                    <img
                      src={m.photo_url}
                      alt={m.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[14px] font-medium"
                      style={{ background: 'rgba(43,24,10,0.06)', color: C.dim }}
                    >
                      {m.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-[14px] font-medium" style={{ color: C.text1 }}>
                      {m.name}
                    </p>
                    {m.role && (
                      <p className="text-[12px]" style={{ color: C.dim }}>
                        {m.role}
                      </p>
                    )}
                    {m.bio && (
                      <p className="text-[13px] mt-1 leading-relaxed" style={{ color: C.text2 }}>
                        {m.bio}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionBlock>
        </Reveal>
      )}

      {/* Investment */}
      {startup.funding_ask != null && (
        <Reveal delay={250}>
          <SectionBlock className="mb-6">
            <h2 className="font-serif font-semibold text-[18px] mb-4" style={{ color: C.text1 }}>
              {t('startups.detail.investment')}
            </h2>

            <div className="flex flex-wrap gap-6 mb-4">
              <div>
                <p className="text-[12px] mb-0.5" style={{ color: C.dim }}>
                  {t('startups.detail.fundingAsk')}
                </p>
                <p className="text-[20px] font-semibold tabular-nums" style={{ color: C.accent }}>
                  {formatCurrency(startup.funding_ask)}
                </p>
              </div>

              <div>
                <p className="text-[12px] mb-0.5" style={{ color: C.dim }}>
                  {t('startups.detail.fundingRaised')}
                </p>
                <p className="text-[20px] font-semibold tabular-nums" style={{ color: C.text1 }}>
                  {formatCurrency(startup.funding_raised)}
                </p>
              </div>

              {startup.funding_instrument && (
                <div>
                  <p className="text-[12px] mb-0.5" style={{ color: C.dim }}>
                    {t('startups.detail.instrument')}
                  </p>
                  <p className="text-[14px] font-medium" style={{ color: C.text1 }}>
                    {startup.funding_instrument}
                  </p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {fundingPercent > 0 && (
              <div>
                <div className="flex justify-between text-[12px] mb-1">
                  <span style={{ color: C.dim }}>{t('startups.detail.progress')}</span>
                  <span className="font-semibold tabular-nums" style={{ color: C.text1 }}>
                    {fundingPercent}%
                  </span>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{ background: 'rgba(43,24,10,0.05)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${fundingPercent}%`,
                      background: 'linear-gradient(90deg, #E8730C, #F0933C)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Use of funds */}
            {startup.use_of_funds.length > 0 && (
              <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.blockBorder}` }}>
                <h3 className="text-[14px] font-medium mb-3" style={{ color: C.text1 }}>
                  {t('startups.detail.useOfFunds')}
                </h3>
                <div className="flex flex-col gap-2">
                  {startup.use_of_funds.map((f) => (
                    <div key={f.id} className="flex items-center justify-between">
                      <span className="text-[13px]" style={{ color: C.text2 }}>
                        {f.item}
                      </span>
                      <span className="text-[13px] font-semibold tabular-nums" style={{ color: C.text1 }}>
                        {f.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionBlock>
        </Reveal>
      )}

      {/* Materials */}
      {(startup.pitch_deck_url || startup.one_pager_url || startup.video_url || startup.website_url) && (
        <Reveal delay={300}>
          <SectionBlock className="mb-6">
            <h2 className="font-serif font-semibold text-[18px] mb-4" style={{ color: C.text1 }}>
              {t('startups.detail.materials')}
            </h2>
            <div className="flex flex-wrap gap-3">
              {startup.pitch_deck_url && (
                <a
                  href={startup.pitch_deck_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors hover:opacity-80"
                  style={{ background: 'rgba(43,24,10,0.05)', color: C.text1 }}
                >
                  <FileText size={14} />
                  Pitch Deck
                  <ExternalLink size={12} />
                </a>
              )}
              {startup.one_pager_url && (
                <a
                  href={startup.one_pager_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors hover:opacity-80"
                  style={{ background: 'rgba(43,24,10,0.05)', color: C.text1 }}
                >
                  <FileText size={14} />
                  One Pager
                  <ExternalLink size={12} />
                </a>
              )}
              {startup.video_url && (
                <a
                  href={startup.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors hover:opacity-80"
                  style={{ background: 'rgba(43,24,10,0.05)', color: C.text1 }}
                >
                  <Play size={14} />
                  {t('startups.detail.video')}
                  <ExternalLink size={12} />
                </a>
              )}
              {startup.website_url && (
                <a
                  href={startup.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors hover:opacity-80"
                  style={{ background: 'rgba(43,24,10,0.05)', color: C.text1 }}
                >
                  <Globe size={14} />
                  {t('startups.detail.website')}
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </SectionBlock>
        </Reveal>
      )}

      {/* Contact CTA */}
      {startup.contact_email && (
        <Reveal delay={350}>
          <div
            className="rounded-[16px] px-6 py-8 text-center"
            style={{ background: '#f7f0e8', border: `1px solid rgba(43,24,10,0.06)` }}
          >
            <h2 className="font-serif font-semibold text-[20px] mb-2" style={{ color: C.text1 }}>
              {t('startups.detail.ctaTitle')}
            </h2>
            <p className="text-[14px] mb-5" style={{ color: C.text2 }}>
              {t('startups.detail.ctaSubtitle')}
            </p>
            <a
              href={`mailto:${startup.contact_email}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[13px] text-[15px] font-medium text-white transition-all hover:brightness-90"
              style={{ backgroundColor: '#3f2407' }}
            >
              <Mail size={16} />
              {t('startups.detail.ctaButton')}
            </a>
          </div>
        </Reveal>
      )}

      {/* Submit your own project CTA */}
      <Reveal delay={400}>
        <div className="mt-8 text-center">
          <p className="text-[14px] mb-3" style={{ color: C.dim }}>
            {t('startups.detail.submitCtaText')}
          </p>
          <button
            type="button"
            onClick={() => setSubmitOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all hover:brightness-90"
            style={{ backgroundColor: 'rgba(232,115,12,0.1)', color: '#E8730C' }}
          >
            <Plus size={16} />
            {t('startups.hero.submitCta')}
          </button>
        </div>
      </Reveal>

      <SubmitStartupModal open={submitOpen} onOpenChange={setSubmitOpen} />
    </div>
  );
}
