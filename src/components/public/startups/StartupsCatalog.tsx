import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useStartups } from '@/hooks/startups/useStartups';
import type { StartupsFilters } from '@/types/startup';
import StartupsFilterBar from './StartupsFilterBar';
import StartupCard from './StartupCard';
import StartupsGridSkeleton from './StartupsGridSkeleton';
import StartupsPagination from './StartupsPagination';
import SubmitStartupModal from './submit/SubmitStartupModal';

const defaultFilters: StartupsFilters = {
  search: '',
  category: null,
  stage: null,
  fundingStatus: null,
  region: null,
  sort: 'newest',
  page: 1,
};

export default function StartupsCatalog() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<StartupsFilters>(defaultFilters);
  const [submitOpen, setSubmitOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useStartups(filters);
  const updateFilters = (patch: Partial<StartupsFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  return (
    <>
      {/* ── Sticky filter bar ── */}
      <div className="sticky top-14 md:top-16 z-30 bg-[#fdf6ee]/95 backdrop-blur-md border-b border-[#2B180A]/8">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-5 md:px-10 py-2 sm:py-2.5 md:py-3">

          {/* CTA — right-aligned, compact on mobile */}
          <div className="flex items-center justify-end mb-2">
            <button
              type="button"
              onClick={() => setSubmitOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] sm:text-[13px] font-medium text-white transition-all hover:brightness-90"
              style={{ backgroundColor: '#E8730C' }}
            >
              <Plus size={13} />
              {t('startups.submit.modalTitle')}
            </button>
          </div>

          {/* Filter bar */}
          <StartupsFilterBar filters={filters} onChange={updateFilters} />
        </div>
      </div>

      {/* ── Grid ── */}
      <section className="py-8 md:py-10" style={{ background: '#fdf6ee' }}>
        <div className="mx-auto max-w-[1200px] px-5 md:px-10">
          {isLoading && <StartupsGridSkeleton />}

          {isError && (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground mb-3">{t('startups.catalog.error')}</p>
              <button
                onClick={() => refetch()}
                className="text-sm font-medium underline underline-offset-4"
                style={{ color: '#E8730C' }}
              >
                {t('startups.catalog.retry')}
              </button>
            </div>
          )}

          {data && data.data.length === 0 && !isLoading && (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">{t('startups.catalog.empty')}</p>
            </div>
          )}

          {data && data.data.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {data.data.map((startup) => (
                  <StartupCard key={startup.id} startup={startup} />
                ))}
              </div>
              <StartupsPagination
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={(p) => updateFilters({ page: p })}
              />
            </>
          )}
        </div>
      </section>

      <SubmitStartupModal open={submitOpen} onOpenChange={setSubmitOpen} />
    </>
  );
}
