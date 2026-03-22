import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Stethoscope, Leaf, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function CabinetDashboard() {
  const { userContext, isContextLoading } = useAuth()
  const navigate = useNavigate()

  if (isContextLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  const farm = userContext?.farms?.[0]
  const orgName = userContext?.organizations?.[0]?.name || 'Моя ферма'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--fg)] font-serif">
          {orgName}
        </h2>
        <p className="text-sm text-[var(--fg2)] mt-1">
          Добро пожаловать в кабинет фермера
        </p>
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <button
          onClick={() => navigate('/cabinet/vet/new')}
          className="w-full flex items-center gap-4 p-4 bg-[var(--bg-c)] rounded-xl border border-[var(--bd)] hover:border-[var(--cta)] transition-colors text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Stethoscope className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--fg)]">Сообщить о болезни</p>
            <p className="text-xs text-[var(--fg2)] mt-0.5">
              AI проанализирует симптомы и предложит рекомендации
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--fg2)]/40 shrink-0" />
        </button>

        <button
          onClick={() => navigate('/cabinet/farm')}
          className="w-full flex items-center gap-4 p-4 bg-[var(--bg-c)] rounded-xl border border-[var(--bd)] hover:border-[var(--cta)] transition-colors text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <Leaf className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--fg)]">Профиль фермы</p>
            <p className="text-xs text-[var(--fg2)] mt-0.5">
              {farm
                ? `${farm.name} — ${farm.herd_groups?.length || 0} групп`
                : 'Заполните данные о ферме'}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--fg2)]/40 shrink-0" />
        </button>
      </div>
    </div>
  )
}
