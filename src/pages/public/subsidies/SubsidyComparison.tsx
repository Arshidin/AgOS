import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

import Footer from '@/components/public/Footer';
import { useCrossConditions } from '@/hooks/subsidies/useCrossConditions';
import { Beef, Wheat, Factory, Droplets, Scale } from 'lucide-react';

const COLUMNS = [
  { key: 'crop_value' as const, label: 'Растениеводство', npa: '№107', icon: Wheat, accent: '#7B6416' },
  { key: 'investment_value' as const, label: 'Инвестиции', npa: '№317', icon: Factory, accent: '#1A3D22' },
  { key: 'livestock_value' as const, label: 'Животноводство', npa: '№108', icon: Beef, accent: '#8B3A1A' },
  { key: 'irrigation_value' as const, label: 'Водосбережение', npa: '№153-НҚ', icon: Droplets, accent: '#1A4166' },
];

export default function SubsidyComparison() {
  const { t } = useTranslation();
  const { data: conditions, isLoading } = useCrossConditions();

  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      <Helmet>
        <title>{t('subsidies.compare.title')}</title>
      </Helmet>
      

      <div className="pt-10 md:pt-14 pb-16 px-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#E8730C]/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-[#E8730C]" />
            </div>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#2B180A]">
                {t('subsidies.compare.title')}
              </h1>
              <p className="text-sm text-[#2B180A]/60 mt-1">
                {t('subsidies.compare.subtitle')}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-[#2B180A]/50">...</div>
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden lg:block bg-white rounded-2xl border border-[#2B180A]/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2B180A]/10">
                      <th className="py-3 px-4 text-left text-xs uppercase tracking-wider text-[#2B180A]/50 font-semibold w-[180px]">
                        {t('subsidies.compare.parameter')}
                      </th>
                      {COLUMNS.map((col) => {
                        const Icon = col.icon;
                        return (
                          <th key={col.key} className="py-3 px-3 text-left">
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-4 h-4" style={{ color: col.accent }} />
                              <div>
                                <span className="text-xs font-semibold text-[#2B180A] block">{col.label}</span>
                                <span className="text-[10px] text-[#2B180A]/40 font-mono">{col.npa}</span>
                              </div>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(conditions ?? []).map((row) => (
                      <tr key={row.id} className="border-b border-[#2B180A]/5 last:border-0">
                        <td className="py-3 px-4 font-semibold text-[#2B180A] text-xs align-top">
                          {row.label_ru}
                        </td>
                        {COLUMNS.map((col) => (
                          <td key={col.key} className="py-3 px-3 text-xs text-[#2B180A]/75 align-top">
                            {row[col.key] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="lg:hidden space-y-4">
                {(conditions ?? []).map((row) => (
                  <div key={row.id} className="bg-white rounded-2xl border border-[#2B180A]/10 p-4">
                    <h3 className="font-semibold text-[#2B180A] text-sm mb-3">{row.label_ru}</h3>
                    <div className="space-y-2">
                      {COLUMNS.map((col) => {
                        const Icon = col.icon;
                        const val = row[col.key];
                        if (!val) return null;
                        return (
                          <div key={col.key} className="flex gap-2">
                            <div className="shrink-0 mt-0.5">
                              <Icon className="w-3.5 h-3.5" style={{ color: col.accent }} />
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-[#2B180A]/40 font-semibold block">
                                {col.label}
                              </span>
                              <span className="text-xs text-[#2B180A]/75">{val}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
