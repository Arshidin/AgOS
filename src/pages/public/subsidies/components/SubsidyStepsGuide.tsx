import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import type { SubsidyStep } from '@/types/subsidy';

interface Props {
  steps: SubsidyStep[];
  platformUrl?: string | null;
  platformName?: string | null;
}

export default function SubsidyStepsGuide({ steps, platformUrl, platformName }: Props) {
  const { t } = useTranslation();

  if (!steps?.length) return null;

  return (
    <section className="bg-white rounded-2xl p-5 md:p-6 border border-[#2B180A]/10">
      <h2 className="font-serif text-xl md:text-2xl font-bold text-[#2B180A] mb-6">
        {t('subsidies.detail.stepsTitle')}
      </h2>

      <div className="relative">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className="flex gap-4 mb-0">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#E8730C] text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                {!isLast && (
                  <div className="w-0.5 bg-[#E8730C]/20 flex-1 min-h-[24px]" />
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-[#2B180A]">{step.title}</h3>
                  {step.time && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8730C]/10 text-[#E8730C] font-medium whitespace-nowrap">
                      {step.time}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#2B180A]/70 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {platformUrl && platformName && (
        <div className="mt-6 pt-4 border-t border-[#2B180A]/10">
          <a
            href={platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E8730C] text-white font-semibold hover:bg-[#d0660a] transition-colors text-sm"
          >
            {t('subsidies.detail.goToPlatform', { name: platformName })}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </section>
  );
}
