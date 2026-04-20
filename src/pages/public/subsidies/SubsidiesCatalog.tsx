import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import Footer from '@/components/public/Footer';
import PageToolbar, { ToolbarChip } from '@/components/layout/PageToolbar';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Beef, Wheat, Factory, Droplets } from 'lucide-react';
import { useSubsidyPrograms } from '@/hooks/subsidies/useSubsidyPrograms';
import type { SubsidyCategory } from '@/types/subsidy';
import { Skeleton } from '@/components/ui/skeleton';

function CatalogGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 border border-[#2B180A]/10">
          <div className="flex justify-between mb-3">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-3" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-2/3 mb-4" />
          <div className="flex justify-between pt-3 border-t border-[#2B180A]/5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

const CATS: Array<{ key: SubsidyCategory | 'all'; icon?: typeof Beef }> = [
  { key: 'all' },
  { key: 'livestock', icon: Beef },
  { key: 'crop', icon: Wheat },
  { key: 'investment', icon: Factory },
  { key: 'irrigation', icon: Droplets },
];

export default function SubsidiesCatalog() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const initialCat = (params.get('category') as SubsidyCategory | null) ?? 'all';
  const [category, setCategory] = useState<SubsidyCategory | 'all'>(initialCat);

  const { data: programs, isLoading } = useSubsidyPrograms(category === 'all' ? undefined : category);

  const lang: 'kz' | 'ru' | 'en' = i18n.language?.startsWith('kk') ? 'kz' : (i18n.language?.startsWith('en') ? 'en' : 'ru');

  const onCatChange = (c: SubsidyCategory | 'all') => {
    setCategory(c);
    if (c === 'all') {
      params.delete('category');
    } else {
      params.set('category', c);
    }
    setParams(params);
  };

  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      <Helmet>
        <title>{t('subsidies.catalog.title')}</title>
      </Helmet>

      
      <PageToolbar>
        {CATS.map((c) => {
          const active = category === c.key;
          const Icon = c.icon;
          return (
            <ToolbarChip key={c.key} active={active} onClick={() => onCatChange(c.key)}>
              {Icon && <Icon className="w-3 h-3" />}
              {c.key === 'all' ? t('subsidies.catalog.filterAll') : t(`subsidies.categories.${c.key}`)}
            </ToolbarChip>
          );
        })}
      </PageToolbar>

      <div className="pt-4 md:pt-10 pb-16 px-3 md:px-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-5 md:mb-10">
            <h1 className="font-serif text-2xl md:text-5xl font-bold text-[#2B180A] mb-1.5 md:mb-3">
              {t('subsidies.catalog.title')}
            </h1>
            <p className="text-sm md:text-base text-[#2B180A]/70">
              {String((t as any)('subsidies.catalog.subtitle', { count: programs?.length ?? '…' }))}
            </p>
          </div>

          {/* Grid */}
          {isLoading ? (
            <CatalogGridSkeleton />
          ) : (programs?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-[#2B180A]/60">
              {t('subsidies.catalog.empty')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
              {(programs ?? []).map((p) => {
                const name = lang === 'kz' ? (p.name_kz || p.name_ru) : lang === 'en' ? (p.name_en || p.name_ru) : p.name_ru;
                return (
                  <Link
                    key={p.id}
                    to={`/subsidies/${p.id}`}
                    className="group block bg-white rounded-2xl p-4 md:p-5 border border-[#2B180A]/10 hover:border-[#E8730C]/40 hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between mb-2.5 md:mb-3 gap-2">
                      <Badge variant="secondary" className="text-[10px] md:text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1">
                        {t(`subsidies.categories.${p.category}`)}
                      </Badge>
                      {p.submission_platform_name && (
                        <span className="text-[11px] md:text-[10px] text-[#2B180A]/45 font-medium whitespace-nowrap">
                          {p.submission_platform_name}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-base md:text-lg font-bold text-[#2B180A] mb-1 md:mb-2 leading-snug">
                      {name}
                    </h3>
                    <p className="text-[11px] md:text-xs text-[#2B180A]/45 mb-2 md:mb-3 font-medium">
                      {p.npa_reference}
                    </p>
                    {p.recipients_ru && (
                      <p className="text-[13px] md:text-sm text-[#2B180A]/65 mb-3 md:mb-4 line-clamp-2 leading-relaxed">
                        {p.recipients_ru}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2.5 md:pt-3 border-t border-[#2B180A]/5">
                      <span className="text-[11px] md:text-xs text-[#2B180A]/45">
                        {p.submission_period || '—'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#E8730C] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
