import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { MembershipStatus } from '@/types/membership';

// DS-token-based styles — no Tailwind opacity syntax
const BADGE_STYLES: Record<MembershipStatus, { bg: string; fg: string }> = {
  applicant:  { bg: 'rgba(179,122,16,0.08)',  fg: 'var(--amber)' },
  observer:   { bg: 'rgba(69,113,184,0.08)',  fg: 'var(--blue)' },
  active:     { bg: 'rgba(58,138,82,0.08)',   fg: 'var(--green)' },
  associate:  { bg: 'rgba(122,107,93,0.08)',  fg: 'var(--fg2, #7a6b5d)' },
  restricted: { bg: 'rgba(192,57,43,0.08)',   fg: 'var(--red)' },
  expelled:   { bg: 'rgba(192,57,43,0.08)',   fg: 'var(--red)' },
};

interface Props {
  status: MembershipStatus;
  className?: string;
}

export function MembershipBadge({ status, className }: Props) {
  const { t } = useTranslation();
  const style = BADGE_STYLES[status] ?? BADGE_STYLES.applicant;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        className,
      )}
      style={{ background: style.bg, color: style.fg }}
    >
      {t(`membership.statuses.${status}`)}
    </span>
  );
}
