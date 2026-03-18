import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'

export function AdminDashboard() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#1a1a2e]">
        Панель администратора
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => navigate('/admin/membership')}
          className="p-5 bg-white rounded-xl border border-[#e2e8f0] hover:border-[#4361ee] hover:shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#4361ee]/10 rounded-lg">
              <Users className="h-5 w-5 text-[#4361ee]" />
            </div>
            <h3 className="font-medium text-[#1a1a2e]">Заявки на членство</h3>
          </div>
          <p className="text-sm text-[#64748b]">
            Рассмотрение и управление заявками на вступление в ассоциацию
          </p>
        </button>
      </div>
    </div>
  )
}
