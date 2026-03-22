/**
 * StatusBadge — TURAN DS v11 semantic status badges.
 * Uses theme-aware status colors from design tokens.
 * Replaces hardcoded bg-blue-100/text-blue-700 etc.
 */

const STATUS_STYLES: Record<string, { bg: string; fg: string; dot: string }> = {
  // Vet case / general statuses
  open:        { bg: 'rgba(69,113,184,0.08)',  fg: 'var(--blue)',  dot: 'var(--blue)' },
  submitted:   { bg: 'rgba(69,113,184,0.08)',  fg: 'var(--blue)',  dot: 'var(--blue)' },
  in_progress: { bg: 'rgba(179,122,16,0.08)',  fg: 'var(--amber)', dot: 'var(--amber)' },
  under_review:{ bg: 'rgba(179,122,16,0.08)',  fg: 'var(--amber)', dot: 'var(--amber)' },
  resolved:    { bg: 'rgba(58,138,82,0.08)',   fg: 'var(--green)', dot: 'var(--green)' },
  approved:    { bg: 'rgba(58,138,82,0.08)',   fg: 'var(--green)', dot: 'var(--green)' },
  active:      { bg: 'rgba(58,138,82,0.08)',   fg: 'var(--green)', dot: 'var(--green)' },
  escalated:   { bg: 'rgba(192,57,43,0.08)',   fg: 'var(--red)',   dot: 'var(--red)' },
  rejected:    { bg: 'rgba(192,57,43,0.08)',   fg: 'var(--red)',   dot: 'var(--red)' },
  closed:      { bg: 'rgba(122,107,93,0.08)',  fg: 'var(--fg2, #7a6b5d)', dot: 'var(--fg2, #7a6b5d)' },
}

const SEVERITY_STYLES: Record<string, { bg: string; fg: string }> = {
  minor:    { bg: 'rgba(58,138,82,0.08)',  fg: 'var(--green)' },
  moderate: { bg: 'rgba(179,122,16,0.08)', fg: 'var(--amber)' },
  severe:   { bg: 'rgba(192,57,43,0.08)',  fg: 'var(--red)' },
  critical: { bg: 'rgba(192,57,43,0.15)',  fg: 'var(--red)' },
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Открыт',
  submitted: 'Подана',
  in_progress: 'В работе',
  under_review: 'На рассмотрении',
  resolved: 'Решён',
  approved: 'Одобрена',
  active: 'Активный',
  escalated: 'Эскалирован',
  rejected: 'Отклонена',
  closed: 'Закрыт',
}

const SEVERITY_LABELS: Record<string, string> = {
  minor: 'Лёгкая',
  moderate: 'Средняя',
  severe: 'Тяжёлая',
  critical: 'Критическая',
}

interface StatusBadgeProps {
  status: string
  label?: string
  showDot?: boolean
  className?: string
}

export function StatusBadge({ status, label, showDot = true, className = '' }: StatusBadgeProps) {
  const fallback = { bg: 'rgba(69,113,184,0.08)', fg: 'var(--blue)', dot: 'var(--blue)' }
  const style = STATUS_STYLES[status] ?? fallback
  const displayLabel = label || STATUS_LABELS[status] || status

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ background: style.bg, color: style.fg }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: style.dot }}
        />
      )}
      {displayLabel}
    </span>
  )
}

interface SeverityBadgeProps {
  severity: string | null | undefined
  label?: string
  className?: string
}

export function SeverityBadge({ severity, label, className = '' }: SeverityBadgeProps) {
  if (!severity) return null
  const fallback = { bg: 'rgba(58,138,82,0.08)', fg: 'var(--green)' }
  const style = SEVERITY_STYLES[severity] ?? fallback
  const displayLabel = label || SEVERITY_LABELS[severity] || severity

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ background: style.bg, color: style.fg }}
    >
      {displayLabel}
    </span>
  )
}
