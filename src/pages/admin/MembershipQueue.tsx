import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Inbox } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRpc } from '@/hooks/useRpc'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'

/**
 * A01 — Membership Queue
 * Dok 6 Slice 2: Admin sees pending membership applications.
 * RPC: rpc_get_membership_queue (list mode)
 */

interface ApplicationItem {
  application_id: string
  org_id: string
  org_name: string
  org_type: string
  bin: string | null
  region_name: string | null
  from_level: string
  to_level: string
  status: string
  submitted_at: string
  notes: string | null
}

interface QueueData {
  items: ApplicationItem[]
  total_count: number
  page: number
  page_size: number
}

const STATUS_TABS = [
  { value: null, label: 'Все' },
  { value: 'submitted', label: 'Ожидает' },
  { value: 'under_review', label: 'На рассмотрении' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'rejected', label: 'Отклонено' },
] as const

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Ожидает',
  under_review: 'На рассмотрении',
  approved: 'Одобрено',
  rejected: 'Отклонено',
}

const ORG_TYPE_LABELS: Record<string, string> = {
  farmer: 'Фермер',
  mpk: 'МПК',
  supplier: 'Поставщик',
  consultant: 'Консультант',
  services: 'Услуги',
  feed_producer: 'Кормопроизводитель',
  other: 'Другое',
}

const LEVEL_LABELS: Record<string, string> = {
  registered: 'Зарегистрирован',
  observer: 'Наблюдатель',
  declared_supplier: 'Заявленный поставщик',
  standard_supplier: 'Стандартный поставщик',
  active_buyer: 'Активный покупатель',
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (diffDays < 7) return `${diffDays} дн. назад`
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function MembershipQueue() {
  const navigate = useNavigate()
  const { organization } = useAuth()
  const [statusFilter, setStatusFilter] = useState<string | null>('submitted')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useRpc<QueueData>(
    'rpc_get_membership_queue',
    {
      p_organization_id: organization?.id ?? '00000000-0000-0000-0000-000000000000',
      p_status_filter: statusFilter,
      p_page: page,
      p_page_size: 20,
    },
    { enabled: true }
  )

  const items = data?.items ?? []
  const totalCount = data?.total_count ?? 0
  const totalPages = Math.ceil(totalCount / 20)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-[var(--blue)]" />
          <h2 className="text-xl font-semibold text-[var(--fg)]">
            Заявки на членство
          </h2>
          {totalCount > 0 && (
            <span className="px-2 py-0.5 text-[var(--blue)] rounded-full text-xs font-medium" style={{ background: 'rgba(69,113,184,0.08)' }}>
              {totalCount}
            </span>
          )}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-[var(--bg-s)] p-1 rounded-lg overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value ?? 'all'}
            onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors',
              statusFilter === tab.value
                ? 'bg-[var(--bg-c)] text-[var(--fg)] font-medium shadow-sm'
                : 'text-[var(--fg2)] hover:text-[var(--fg)]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-[var(--fg3)] mb-3" />
          <p className="text-sm text-[var(--fg2)]">Нет заявок с таким статусом</p>
        </div>
      )}

      {/* Application list */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((app) => (
              <button
                key={app.application_id}
                onClick={() => navigate(`/admin/membership/${app.application_id}`)}
                className="w-full p-4 bg-[var(--bg-c)] rounded-xl border border-[var(--bd)] hover:border-[var(--blue)] hover:shadow-sm transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[var(--fg)] truncate">
                        {app.org_name}
                      </span>
                      <span className="shrink-0 px-1.5 py-0.5 bg-[var(--bg-s)] text-[var(--fg2)] rounded text-[10px] uppercase">
                        {ORG_TYPE_LABELS[app.org_type] ?? app.org_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--fg2)]">
                      {app.region_name && <span>{app.region_name}</span>}
                      <span>
                        {LEVEL_LABELS[app.from_level] ?? app.from_level} → {LEVEL_LABELS[app.to_level] ?? app.to_level}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusBadge status={app.status} label={STATUS_LABELS[app.status] ?? app.status} showDot={false} />
                    <span className="text-[10px] text-[var(--fg3)]">
                      {relativeDate(app.submitted_at)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Предыдущая страница"
            className="px-3 py-1.5 text-sm rounded-md border border-[var(--bd)] disabled:opacity-40 hover:bg-[var(--bg-s)]"
          >
            Назад
          </button>
          <span className="text-sm text-[var(--fg2)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Следующая страница"
            className="px-3 py-1.5 text-sm rounded-md border border-[var(--bd)] disabled:opacity-40 hover:bg-[var(--bg-s)]"
          >
            Далее
          </button>
        </div>
      )}
    </div>
  )
}
