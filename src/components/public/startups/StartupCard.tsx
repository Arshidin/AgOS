import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import type { Startup } from '@/types/startup';
import { formatCurrency } from '@/lib/formatCurrency';
import StartupCategoryBadge from './StartupCategoryBadge';
import StartupStageBadge from './StartupStageBadge';

export default function StartupCard({ startup }: { startup: Startup }) {
  const { t } = useTranslation();

  return (
    <Link
      to={`/startups/${startup.slug}`}
      className="group block rounded-[16px] overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{
        background: '#f7f0e8',
        border: '1px solid rgba(43,24,10,0.08)',
      }}
    >
      {/* Cover image */}
      {startup.cover_image_url ? (
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={startup.cover_image_url}
            alt={startup.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div
          className="aspect-[16/10] flex items-center justify-center"
          style={{ background: 'rgba(43,24,10,0.04)' }}
        >
          <span className="text-[40px] opacity-20">🚀</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col gap-2.5">
        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <StartupCategoryBadge category={startup.category} />
          <StartupStageBadge stage={startup.stage} />
        </div>

        {/* Title */}
        <h3
          className="font-serif font-semibold text-[16px] leading-[1.3] line-clamp-1"
          style={{ color: '#2B180A' }}
        >
          {startup.title}
        </h3>

        {/* Tagline */}
        {startup.tagline && (
          <p
            className="text-[13px] leading-relaxed line-clamp-2"
            style={{ color: 'rgba(43,24,10,0.6)' }}
          >
            {startup.tagline}
          </p>
        )}

        {/* Bottom: region + funding */}
        <div
          className="flex items-center justify-between pt-2 mt-auto"
          style={{ borderTop: '1px solid rgba(43,24,10,0.06)' }}
        >
          {startup.location_region ? (
            <div className="flex items-center gap-1 text-[12px]" style={{ color: 'rgba(43,24,10,0.45)' }}>
              <MapPin size={12} />
              <span className="truncate max-w-[140px]">
                {t(`constants.regions.${startup.location_region}`, { defaultValue: startup.location_region })}
              </span>
            </div>
          ) : (
            <span />
          )}

          {startup.funding_ask != null && (
            <span
              className="text-[13px] font-semibold tabular-nums"
              style={{ color: '#E8730C' }}
            >
              {formatCurrency(startup.funding_ask)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
