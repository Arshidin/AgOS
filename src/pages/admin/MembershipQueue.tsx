import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Inbox } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRpc } from '@/hooks/useRpc'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

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

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Ожидает', className: 'bg-blue-100 text-blue-700' },
  under_review: { label: 'На рассмотрении', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Одобрено', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонено', className: 'bg-red-100 text-red-700' },
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
          <Users className="h-5 w-5 text-[#4361ee]" />
          <h2 className="text-xl font-semibold text-[#1a1a2e]">
            Заявки на членство
          </h2>
          {totalCount > 0 && (
            <span className="px-2 py-0.5 bg-[#4361ee]/10 text-[#4361ee] rounded-full text-xs font-medium">
              {totalCount}
            </span>
          )}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-[#f1f5f9] p-1 rounded-lg overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value ?? 'all'}
            onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors',
              statusFilter === tab.value
                ? 'bg-white text-[#1a1a2e] font-medium shadow-sm'
                : 'text-[#64748b] hover:text-[#1a1a2e]'
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
          <Inbox className="h-12 w-12 text-[#e2e8f0] mb-3" />
          <p className="text-sm text-[#64748b]">Нет заявок с таким статусом</p>
        </div>
      )}

      {/* Application list */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((app) => {
            const statusInfo = STATUS_BADGES[app.status] ?? { label: app.status, className: 'bg-gray-100 text-gray-700' }
            return (
              <button
                key={app.application_id}
                onClick={() => navigate(`/admin/membership/${app.application_id}`)}
                className="w-full p-4 bg-white rounded-xl border border-[#e2e8f0] hover:border-[#4361ee]/40 hover:shadow-sm transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#1a1a2e] truncate">
                        {app.org_name}
                      </span>
                      <span className="shrink-0 px-1.5 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded text-[10px] uppercase">
                        {ORG_TYPE_LABELS[app.org_type] ?? app.org_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#64748b]">
                      {app.region_name && <span>{app.region_name}</span>}
                      <span>
                        {LEVEL_LABELS[app.from_level] ?? app.from_level} → {LEVEL_LABELS[app.to_level] ?? app.to_level}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusInfo.className)}>
                      {statusInfo.label}
                    </span>
                    <span className="text-[10px] text-[#94a3b8]">
                      {relativeDate(app.submitted_at)}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-md border border-[#e2e8f0] disabled:opacity-40 hover:bg-[#f1f5f9]"
          >
            Назад
          </button>
          <span className="text-sm text-[#64748b]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-md border border-[#e2e8f0] disabled:opacity-40 hover:bg-[#f1f5f9]"
          >
            Далее
          </button>
        </div>
      )}
    </div>
  )
}
