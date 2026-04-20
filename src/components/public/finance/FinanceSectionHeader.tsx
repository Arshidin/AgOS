import { CreditCard, Sprout, Sparkles } from 'lucide-react';
import SectionHeader, { type SectionTab } from '@/components/layout/SectionHeader';

const FINANCE_TABS: SectionTab[] = [
  { key: 'credits', to: '/finance/programs', labelKey: 'finance.subnav.credits', icon: CreditCard, match: (p) => p.startsWith('/finance/programs') },
  { key: 'subsidies', to: '/subsidies', labelKey: 'finance.subnav.subsidies', icon: Sprout, match: (p) => p.startsWith('/subsidies') },
  { key: 'build', to: '/finance/build', labelKey: 'finance.subnav.build', icon: Sparkles, match: (p) => p.startsWith('/finance/build') },
];

export default function FinanceSectionHeader() {
  return <SectionHeader sectionLabelKey="nav.financing" tabs={FINANCE_TABS} />;
}
