import { useTranslation } from 'react-i18next';
import type { FundingStatus } from '@/types/startup';

const STATUS_STYLE: Record<FundingStatus, { bg: string; text: string }> = {
  open:         { bg: 'rgba(107,158,107,0.1)', text: '#4A7A4A' },
  closing_soon: { bg: 'rgba(196,155,58,0.1)', text: '#8B6914' },
  closed:       { bg: 'rgba(180,80,80,0.1)', text: '#993333' },
};

export default function FundingStatusBadge({ status }: { status: FundingStatus }) {
  const { t } = useTranslation();
  const style = STATUS_STYLE[status]!;

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ background: style.bg, color: style.text }}
    >
      {t(`constants.fundingStatuses.${status}`)}
    </span>
  );
}
