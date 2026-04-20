import { useTranslation } from 'react-i18next';
import type { StartupStage } from '@/types/startup';

const STAGE_STYLE: Record<StartupStage, { bg: string; text: string }> = {
  idea:     { bg: 'rgba(43,24,10,0.06)', text: 'rgba(43,24,10,0.5)' },
  pre_seed: { bg: 'rgba(196,155,58,0.1)', text: '#8B6914' },
  seed:     { bg: 'rgba(232,115,12,0.1)', text: '#C0620A' },
  series_a: { bg: 'rgba(107,158,107,0.1)', text: '#4A7A4A' },
  growth:   { bg: 'rgba(60,120,200,0.1)', text: '#2D6BBF' },
};

export default function StartupStageBadge({ stage }: { stage: StartupStage }) {
  const { t } = useTranslation();
  const style = STAGE_STYLE[stage]!;

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ background: style.bg, color: style.text }}
    >
      {t(`constants.startupStages.${stage}`)}
    </span>
  );
}
