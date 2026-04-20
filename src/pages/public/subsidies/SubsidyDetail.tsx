import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import Footer from '@/components/public/Footer';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, ExternalLink, FileText, AlertTriangle, Check, Info, X } from 'lucide-react';
import InvestmentPassportsSection from '@/components/public/subsidies/InvestmentPassportsSection';
import { useSubsidyProgram } from '@/hooks/subsidies/useSubsidyPrograms';
import { useSubsidyRates } from '@/hooks/subsidies/useSubsidyRates';
import { useIsMobile } from '@/hooks/use-mobile';
import SubsidyCalculator from './components/SubsidyCalculator';
import SubsidyStepsGuide from './components/SubsidyStepsGuide';
import GlossaryTooltip from '@/components/public/subsidies/GlossaryTooltip';
import { formatKzt } from '@/lib/subsidies/calculator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';

function SubsidyDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      <div className="pt-6 md:pt-14 pb-12 md:pb-16 px-3 md:px-4">
        <div className="max-w-[1000px] mx-auto">
          <Skeleton className="h-4 w-24 mb-4" />
          <div className="bg-white rounded-2xl p-4 md:p-8 border border-[#2B180A]/10 mb-4 md:mb-6">
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
            <Skeleton className="h-8 w-3/4 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6 border-t border-[#2B180A]/10">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function SubsidyDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: program, isLoading } = useSubsidyProgram(id);
  const { data: rates = [] } = useSubsidyRates(id);
  const isMobile = useIsMobile();

  const lang: 'kz' | 'ru' | 'en' = i18n.language?.startsWith('kk') ? 'kz' : (i18n.language?.startsWith('en') ? 'en' : 'ru');

  if (isLoading) {
    return <SubsidyDetailSkeleton />;
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-[#fdf6ee]">
        <div className="pt-32 text-center text-[#2B180A]/60">Не найдено</div>
      </div>
    );
  }

  const name = lang === 'kz' ? (program.name_kz || program.name_ru) : lang === 'en' ? (program.name_en || program.name_ru) : program.name_ru;
  const desc = lang === 'kz' ? (program.description_kz || program.description_ru) : program.description_ru;

  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      <Helmet>
        <title>{name}</title>
      </Helmet>
      
      <div className="pt-6 md:pt-14 pb-12 md:pb-16 px-3 md:px-4">
        <div className="max-w-[1000px] mx-auto">
          <Link to="/subsidies/catalog" className="inline-flex items-center gap-1 text-xs md:text-sm text-[#2B180A]/60 hover:text-[#E8730C] mb-3 md:mb-4">
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {t('subsidies.detail.back')}
          </Link>

          {/* Hero card */}
          <div className="bg-white rounded-2xl p-4 md:p-8 border border-[#2B180A]/10 mb-4 md:mb-6">
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
              <Badge variant="secondary" className="text-[9px] md:text-xs">{t(`subsidies.categories.${program.category}`)}</Badge>
              <Badge variant="outline" className="text-[9px] md:text-xs">{program.npa_reference}</Badge>
              {program.reg_number && (
                <Badge variant="outline" className="font-mono text-[9px] md:text-xs">{program.reg_number}</Badge>
              )}
            </div>
            <h1 className="font-serif text-2xl md:text-4xl font-bold text-[#2B180A] mb-2 md:mb-3 leading-tight">{name}</h1>
            {desc && <p className="text-sm md:text-base text-[#2B180A]/75 whitespace-pre-line">{desc}</p>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-[#2B180A]/10">
              {program.submission_platform_name && (
                <InfoCell
                  icon={<ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#E8730C]" />}
                  label={t('subsidies.detail.platform')}
                  value={program.submission_platform_url ? (
                    <a href={program.submission_platform_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#E8730C]">
                      {program.submission_platform_name}
                    </a>
                  ) : program.submission_platform_name}
                />
              )}
              {program.submission_period && (
                <InfoCell
                  icon={<Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#E8730C]" />}
                  label={t('subsidies.detail.submissionPeriod')}
                  value={program.submission_period}
                />
              )}
              {program.processing_days != null && (
                <InfoCell
                  icon={<Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#E8730C]" />}
                  label={t('subsidies.detail.processingDays')}
                  value={`${program.processing_days} ${t('subsidies.detail.days')}`}
                />
              )}
            </div>
          </div>

          {/* Key info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
            {program.recipients_ru && (
              <InfoBlock title={t('subsidies.detail.recipients')} body={program.recipients_ru} glossary />
            )}
            {program.reimbursement_rate_text && (
              <InfoBlock title={t('subsidies.detail.reimbursement')} body={program.reimbursement_rate_text} glossary />
            )}
            {program.formula_text && (
              <InfoBlock title={t('subsidies.detail.formula')} body={program.formula_text} mono />
            )}
          </div>

          {/* Rates — mobile cards, desktop table */}
          {rates.length > 0 && (
            <section className="bg-white rounded-2xl p-4 md:p-6 border border-[#2B180A]/10 mb-4 md:mb-6">
              <h2 className="font-serif text-lg md:text-2xl font-bold text-[#2B180A] mb-3 md:mb-4">
                {t('subsidies.detail.rates')}
              </h2>

              {isMobile ? (
                <MobileRatesGrouped rates={rates} />
              ) : (
                /* Desktop: table */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-[#2B180A]/10 text-[#2B180A]/60 text-xs uppercase tracking-wider">
                        <th className="py-2 pr-3">{t('subsidies.detail.rateName')}</th>
                        <th className="py-2 px-2 whitespace-nowrap">{t('subsidies.detail.rateUnit')}</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">{t('subsidies.detail.rateValue')}</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">{t('subsidies.detail.rateCap')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rates.map((r) => (
                        <tr key={r.id} className="border-b border-[#2B180A]/5 last:border-0">
                          <td className="py-2 pr-3 text-[#2B180A]">
                            {r.subcategory && <span className="text-[11px] text-[#2B180A]/40 block">{r.subcategory}</span>}
                            {r.name_ru}
                            {r.condition_ru && <span className="text-[11px] text-[#2B180A]/50 block italic mt-0.5">{r.condition_ru}</span>}
                          </td>
                          <td className="py-2 px-2 text-[#2B180A]/70 whitespace-nowrap">{r.unit ?? '—'}</td>
                          <td className="py-2 px-2 text-right font-semibold text-[#2B180A] whitespace-nowrap">
                            {r.rate_kzt != null ? formatKzt(r.rate_kzt) : '—'}
                          </td>
                          <td className="py-2 px-2 text-right text-[#2B180A]/70 whitespace-nowrap">
                            {r.rate_cap_pct != null ? `${r.rate_cap_pct}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Investment passports accordion */}
          {program.category === 'investment' && (
            <InvestmentPassportsSection subsidyId={program.id} />
          )}

          {/* Calculator */}
          {rates.length > 0 && (
            <div className="mb-4 md:mb-6">
              <SubsidyCalculator rates={rates} category={program.category} />
            </div>
          )}

          {/* Steps guide */}
          {program.steps?.length > 0 && (
            <div className="mb-4 md:mb-6">
              <SubsidyStepsGuide
                steps={program.steps}
                platformUrl={program.submission_platform_url}
                platformName={program.submission_platform_name}
              />
            </div>
          )}

          {/* Obligations & sanctions */}
          {(program.obligations_ru || program.sanctions_ru) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              {program.obligations_ru && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-amber-700" />
                    <h3 className="font-semibold text-amber-900 text-sm md:text-base">{t('subsidies.detail.obligations')}</h3>
                  </div>
                  <p className="text-xs md:text-sm text-amber-900/80">{program.obligations_ru}</p>
                </div>
              )}
              {program.sanctions_ru && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-700" />
                    <h3 className="font-semibold text-red-900 text-sm md:text-base">{t('subsidies.detail.sanctions')}</h3>
                  </div>
                  <p className="text-xs md:text-sm text-red-900/80">{program.sanctions_ru}</p>
                </div>
              )}
            </div>
          )}

          {/* Documents */}
          {program.documents?.length > 0 && (
            <section className="bg-white rounded-2xl p-4 md:p-6 border border-[#2B180A]/10 mb-4 md:mb-6">
              <h2 className="font-serif text-lg md:text-xl font-bold text-[#2B180A] mb-3 md:mb-4">{t('subsidies.detail.documents')}</h2>
              <ul className="space-y-2">
                {program.documents.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs md:text-sm">
                    <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#E8730C] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[#2B180A]">{d.name}</span>
                      <span className={`ml-1.5 md:ml-2 text-[10px] md:text-xs ${d.required ? 'text-red-600' : 'text-[#2B180A]/40'}`}>
                        ({d.required ? t('subsidies.detail.required') : t('subsidies.detail.optional')})
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* FAQ */}
          {program.faq?.length > 0 && (
            <section className="bg-white rounded-2xl p-4 md:p-6 border border-[#2B180A]/10 mb-4 md:mb-6">
              <h2 className="font-serif text-lg md:text-xl font-bold text-[#2B180A] mb-3 md:mb-4">{t('subsidies.detail.faq')}</h2>
              <div className="space-y-3 md:space-y-4">
                {program.faq.map((f, i) => (
                  <div key={i}>
                    <p className="font-semibold text-[#2B180A] text-sm mb-1">{f.q}</p>
                    <p className="text-xs md:text-sm text-[#2B180A]/75">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cross-link to credits */}
          <Link
            to="/finance"
            className="block text-center py-3 md:py-4 rounded-2xl border border-dashed border-[#E8730C]/40 text-[#E8730C] font-medium text-sm md:text-base hover:bg-[#E8730C]/5 transition-colors"
          >
            {t('subsidies.detail.linkFinance')}
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-[#2B180A]/50 mb-0.5 md:mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xs md:text-sm font-medium text-[#2B180A]">{value}</div>
    </div>
  );
}

function InfoBlock({ title, body, mono, glossary }: { title: string; body: string; mono?: boolean; glossary?: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#2B180A]/10">
      <h3 className="text-[10px] md:text-xs font-semibold text-[#2B180A]/50 uppercase tracking-wider mb-1.5 md:mb-2">{title}</h3>
      <p className={`text-xs md:text-sm text-[#2B180A]/85 whitespace-pre-line ${mono ? 'font-mono text-[10px] md:text-xs' : ''}`}>
        {glossary ? <GlossaryTooltip text={body} /> : body}
      </p>
    </div>
  );
}

/* ── Mobile Rates: grouped by subcategory, conditions in drawer ── */
interface RateRow {
  id: string;
  subcategory?: string | null;
  name_ru: string;
  condition_ru?: string | null;
  unit?: string | null;
  rate_kzt?: number | null;
  rate_cap_pct?: number | null;
}

function MobileRatesGrouped({ rates }: { rates: RateRow[] }) {
  const [selectedRate, setSelectedRate] = useState<RateRow | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, RateRow[]>();
    for (const r of rates) {
      const key = r.subcategory || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [rates]);

  return (
    <>
      <div className="space-y-4">
        {grouped.map(([subcat, items]) => (
          <div key={subcat}>
            {subcat && (
              <p className="text-[10px] text-[#2B180A]/40 uppercase tracking-wider font-semibold mb-2 px-0.5">
                {subcat}
              </p>
            )}
            <div className="space-y-2">
              {items.map((r) => (
                <div
                  key={r.id}
                  className="border border-[#2B180A]/8 rounded-xl p-3 flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#2B180A] leading-snug mb-1.5">
                      {r.name_ru}
                    </p>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-[#2B180A]/50">{r.unit ?? '—'}</span>
                      <span className="font-semibold text-[#2B180A]">
                        {r.rate_kzt != null ? formatKzt(r.rate_kzt) : '—'}
                      </span>
                      {r.rate_cap_pct != null && (
                        <span className="text-[#2B180A]/45">≤{r.rate_cap_pct}%</span>
                      )}
                    </div>
                  </div>
                  {r.condition_ru && (
                    <button
                      onClick={() => setSelectedRate(r)}
                      className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-[#2B180A]/5 active:bg-[#2B180A]/10 transition-colors"
                      aria-label="Условия"
                    >
                      <Info className="w-3.5 h-3.5 text-[#2B180A]/40" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Conditions drawer */}
      <Drawer open={!!selectedRate} onOpenChange={(open) => !open && setSelectedRate(null)}>
        <DrawerContent className="bg-[#fdf6ee]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="font-serif text-base font-bold text-[#2B180A] leading-snug pr-8">
              {selectedRate?.name_ru}
            </DrawerTitle>
            <DrawerClose className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[#2B180A]/5">
              <X className="w-4 h-4 text-[#2B180A]/50" />
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {selectedRate?.subcategory && (
              <p className="text-[10px] text-[#2B180A]/40 uppercase tracking-wider mb-2">
                {selectedRate.subcategory}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm mb-4">
              <span className="text-[#2B180A]/50">{selectedRate?.unit ?? '—'}</span>
              <span className="font-semibold text-[#2B180A]">
                {selectedRate?.rate_kzt != null ? formatKzt(selectedRate.rate_kzt) : '—'}
              </span>
              {selectedRate?.rate_cap_pct != null && (
                <Badge variant="outline" className="text-[10px]">≤{selectedRate.rate_cap_pct}%</Badge>
              )}
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-[#2B180A]/8">
              <p className="text-[10px] font-semibold text-[#2B180A]/40 uppercase tracking-wider mb-1.5">Условия</p>
              <p className="text-[13px] text-[#2B180A]/75 leading-relaxed whitespace-pre-line">
                {selectedRate?.condition_ru}
              </p>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
