import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function StepSuccess({ onClose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-5">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(107,158,107,0.1)' }}
      >
        <CheckCircle size={28} style={{ color: '#5A8A5A' }} />
      </div>

      <div>
        <h2 className="font-serif font-semibold text-[22px] mb-2" style={{ color: '#2B180A' }}>
          {t('startups.submit.successTitle')}
        </h2>
        <p className="text-[14px] leading-relaxed max-w-[380px] mx-auto" style={{ color: 'rgba(43,24,10,0.6)' }}>
          {t('startups.submit.successMessage')}
        </p>
      </div>

      <div
        className="rounded-xl px-4 py-3 text-[13px] max-w-[360px]"
        style={{ background: 'rgba(43,24,10,0.03)', color: 'rgba(43,24,10,0.5)' }}
      >
        {t('startups.submit.successNote')}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-2 px-7 py-3 text-[15px] font-medium rounded-[13px] transition-all hover:brightness-90"
        style={{ backgroundColor: '#3f2407', color: '#fff' }}
      >
        {t('startups.submit.backToCatalog')}
      </button>
    </div>
  );
}
