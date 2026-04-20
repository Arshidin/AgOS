import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

import Footer from '@/components/public/Footer';
import { useGlossary } from '@/hooks/subsidies/useGlossary';
import { BookOpen } from 'lucide-react';

export default function GlossaryPage() {
  const { t } = useTranslation();
  const { data: terms, isLoading } = useGlossary();

  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      <Helmet>
        <title>{t('subsidies.glossary.title')}</title>
      </Helmet>
      

      <div className="pt-10 md:pt-14 pb-16 px-4">
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#E8730C]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#E8730C]" />
            </div>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#2B180A]">
                {t('subsidies.glossary.title')}
              </h1>
              <p className="text-sm text-[#2B180A]/60 mt-1">
                {t('subsidies.glossary.subtitle')}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-[#2B180A]/50">...</div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#2B180A]/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2B180A]/10 text-left">
                    <th className="py-3 px-4 text-xs uppercase tracking-wider text-[#2B180A]/50 font-semibold w-[140px]">
                      {t('subsidies.glossary.abbreviation')}
                    </th>
                    <th className="py-3 px-4 text-xs uppercase tracking-wider text-[#2B180A]/50 font-semibold">
                      {t('subsidies.glossary.definition')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(terms ?? []).map((term) => (
                    <tr key={term.id} className="border-b border-[#2B180A]/5 last:border-0">
                      <td className="py-3 px-4 font-semibold text-[#E8730C] whitespace-nowrap align-top">
                        {term.abbreviation}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#2B180A]">{term.full_name_ru}</p>
                        {term.description_ru && (
                          <p className="text-xs text-[#2B180A]/60 mt-1">{term.description_ru}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
