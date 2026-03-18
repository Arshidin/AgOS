import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { MembershipStatus } from '@/types/membership';

// bg-{color}-500/10 text-{color}-500 — работает в обеих темах
const BADGE_COLORS: Record<MembershipStatus, string> = {
  registered: 'bg-gray-500/10 text-gray-500',
  applicant: 'bg-orange-500/10 text-orange-500',
  observer: 'bg-blue-500/10 text-blue-500',
  active: 'bg-green-500/10 text-green-500',
  associate: 'bg-purple-500/10 text-purple-500',
  restricted: 'bg-red-500/10 text-red-500',
  expelled: 'bg-red-500/10 text-red-500',
};

interface Props {
  status: MembershipStatus;
  className?: string;
}

export function MembershipBadge({ status, className }: Props) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        BADGE_COLORS[status],
        className,
      )}
    >
      {t(`membership.statuses.${status}`)}
    </span>
  );
}
