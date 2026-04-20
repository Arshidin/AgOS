import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import Footer from '@/components/public/Footer';
import SubsidiesSecondaryNav from '@/components/public/subsidies/SubsidiesSecondaryNav';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search } from 'lucide-react';
import { useInvestmentPassport, useInvestmentItems, useInvestmentPassports } from '@/hooks/subsidies/useInvestmentPassports';
import { formatKzt } from '@/lib/subsidies/calculator';

export default function PassportDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: passport } = useInvestmentPassport(id);
  const { data: items = [] } = useInvestmentItems(id);
  const { data: allPassports = [] } = useInvestmentPassports();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) =>
      i.name_ru.toLowerCase().includes(q) ||
      (i.position_code?.toLowerCase().includes(q) ?? false)
    );
  }, [items, search]);

  const showList = !id;

  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      <Helmet>
        <title>{passport ? t('subsidies.passport.title', { number: passport.passport_number }) : t('subsidies.passport.catalog')}</title>
      </Helmet>
      
      <SubsidiesSecondaryNav />

      <div className="pt-8 md:pt-12 pb-16 px-4">
        <div className="max-w-[1200px] mx-auto">
          {showList ? (
            <>
              <Link to="/subsidies" className="inline-flex items-center gap-1 text-sm text-[#2B180A]/60 hover:text-[#E8730C] mb-4">
                <ArrowLeft className="w-4 h-4" />
                {t('subsidies.detail.back')}
              </Link>
              <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#2B180A] mb-3">
                {t('subsidies.passport.catalog')}
              </h1>
              <p className="text-[#2B180A]/70 mb-8">{t('subsidies.passport.subtitle')}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allPassports.map((p) => (
                  <Link
                    key={p.id}
                    to={`/subsidies/passports/${p.id}`}
                    className="group bg-white rounded-2xl p-5 border border-[#2B180A]/10 hover:border-[#E8730C]/40 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="font-mono">№{p.passport_number}</Badge>
                      {p.default_rate_pct != null && (
                        <Badge variant="outline" className="text-xs">{p.default_rate_pct}%</Badge>
                      )}
                    </div>
                    <h3 className="font-serif text-base font-bold text-[#2B180A] leading-snug">
                      {p.name_ru}
                    </h3>
                  </Link>
                ))}
              </div>
            </>
          ) : !passport ? (
            <div className="text-center py-16 text-[#2B180A]/60">Не найдено</div>
          ) : (
            <>
              <Link to="/subsidies/passports" className="inline-flex items-center gap-1 text-sm text-[#2B180A]/60 hover:text-[#E8730C] mb-4">
                <ArrowLeft className="w-4 h-4" />
                {t('subsidies.detail.backInvest')}
              </Link>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="secondary" className="font-mono">№{passport.passport_number}</Badge>
                {passport.default_rate_pct != null && (
                  <Badge variant="outline">{passport.default_rate_pct}%</Badge>
                )}
                <Badge variant="outline" className="text-xs">{filtered.length} {t('subsidies.passport.items')}</Badge>
              </div>
              <h1 className="font-serif text-2xl md:text-4xl font-bold text-[#2B180A] mb-6">
                {passport.name_ru}
              </h1>

              {/* Search */}
              <div className="mb-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#2B180A]/40" />
                <Input
                  placeholder={t('subsidies.passport.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Items table */}
              <div className="bg-white rounded-2xl border border-[#2B180A]/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#2B180A]/5 text-left text-xs uppercase tracking-wider text-[#2B180A]/60">
                        <th className="py-3 px-3 whitespace-nowrap">{t('subsidies.passport.code')}</th>
                        <th className="py-3 px-3">{t('subsidies.passport.name')}</th>
                        <th className="py-3 px-2 whitespace-nowrap">{t('subsidies.passport.unit')}</th>
                        <th className="py-3 px-2 text-right whitespace-nowrap">{t('subsidies.passport.rate')}</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">{t('subsidies.passport.maxCost')}</th>
                        <th className="py-3 px-3 whitespace-nowrap">{t('subsidies.passport.threshold')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr><td colSpan={6} className="py-8 text-center text-[#2B180A]/50">{t('subsidies.passport.empty')}</td></tr>
                      )}
                      {filtered.map((item) => (
                        <tr key={item.id} className="border-t border-[#2B180A]/5 hover:bg-[#fdf6ee]/50">
                          <td className="py-2 px-3 font-mono text-xs text-[#2B180A]/60 whitespace-nowrap">
                            {item.position_code || '—'}
                          </td>
                          <td className="py-2 px-3 text-[#2B180A]">
                            {item.name_ru}
                            {item.note_ru && <span className="text-[11px] text-[#2B180A]/50 italic block mt-0.5">{item.note_ru}</span>}
                          </td>
                          <td className="py-2 px-2 text-[#2B180A]/70 whitespace-nowrap">{item.unit}</td>
                          <td className="py-2 px-2 text-right text-[#E8730C] font-semibold whitespace-nowrap">
                            {item.reimbursement_rate_pct != null ? `${item.reimbursement_rate_pct}%` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-[#2B180A] whitespace-nowrap">
                            {item.max_cost_kzt != null ? formatKzt(item.max_cost_kzt) : '—'}
                          </td>
                          <td className="py-2 px-3 text-xs text-[#2B180A]/60">{item.min_threshold_ru || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
