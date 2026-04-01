import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export function AdminDashboard() {
  const navigate = useNavigate()

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader title="Панель управления" description="Администрирование TURAN" />

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => navigate('/admin/membership')}
          className="p-5 bg-card rounded-[10px] border border-border hover:border-[var(--blue)] hover:shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(69,113,184,0.12)' }}>
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
