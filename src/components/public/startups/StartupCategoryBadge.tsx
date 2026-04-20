import { useTranslation } from 'react-i18next';
import type { StartupCategory } from '@/types/startup';

const CATEGORY_STYLE: Record<StartupCategory, { bg: string; text: string }> = {
  agritech:         { bg: 'rgba(107,158,107,0.1)', text: '#4A7A4A' },
  livestock:        { bg: 'rgba(196,136,58,0.1)', text: '#8B6914' },
  feed_nutrition:   { bg: 'rgba(232,115,12,0.08)', text: '#C0620A' },
  genetics:         { bg: 'rgba(130,100,180,0.1)', text: '#6B4E9B' },
  cold_chain:       { bg: 'rgba(70,140,180,0.1)', text: '#2E7DA8' },
  processing:       { bg: 'rgba(180,80,80,0.1)', text: '#993333' },
  digital_platform: { bg: 'rgba(60,120,200,0.1)', text: '#2D6BBF' },
  sustainability:   { bg: 'rgba(80,160,120,0.1)', text: '#2D8A5E' },
};

export default function StartupCategoryBadge({ category }: { category: StartupCategory }) {
  const { t } = useTranslation();
  const style = CATEGORY_STYLE[category]!;

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ background: style.bg, color: style.text }}
    >
      {t(`constants.startupCategories.${category}`)}
    </span>
  );
}
