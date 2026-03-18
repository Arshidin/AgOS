import { Outlet, NavLink } from 'react-router-dom'
import { Users, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Admin panel layout — neutral .light palette.
 * Desktop-first, max-width 1024px.
 */
export function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-[#1a1a2e]">
              AgOS Admin
            </h1>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-[#4361ee]/10 text-[#4361ee] font-medium'
                    : 'text-[#64748b] hover:text-[#1a1a2e] hover:bg-[#f1f5f9]'
                )
              }
            >
              <LayoutDashboard className="h-4 w-4" />
              Главная
            </NavLink>
            <NavLink
              to="/admin/membership"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-[#4361ee]/10 text-[#4361ee] font-medium'
                    : 'text-[#64748b] hover:text-[#1a1a2e] hover:bg-[#f1f5f9]'
                )
              }
            >
              <Users className="h-4 w-4" />
              Членство
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
