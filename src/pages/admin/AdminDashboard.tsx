import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'

export function AdminDashboard() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[var(--fg)]">
        Панель администратора
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => navigate('/admin/membership')}
          className="p-5 bg-[var(--bg-c)] rounded-xl border border-[var(--bd)] hover:border-[var(--blue)] hover:shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[color-mix(in_srgb,var(--blue)_10%,transparent)] rounded-lg">
              <Users className="h-5 w-5 text-[var(--blue)]" />
            </div>
            <h3 className="font-medium text-[var(--fg)]">Заявки на членство</h3>
          </div>
          <p className="text-sm text-[var(--fg2)]">
            Рассмотрение и управление заявками на вступление в ассоциацию
          </p>
        </button>
      </div>
    </div>
  )
}
