/**
 * ProjectPage — container for consulting project with topbar tabs.
 * Pattern: same as RationPage (useSetTopbar + Outlet).
 *
 * Routes:
 *   /admin/consulting/:projectId          → redirect → /admin/consulting/:projectId/summary
 *   /admin/consulting/:projectId/edit     → ProjectWizard (parameter input)
 *   /admin/consulting/:projectId/summary  → Summary tab
 *   /admin/consulting/:projectId/herd     → Herd turnover tab
 *   /admin/consulting/:projectId/pnl      → P&L tab
 *   /admin/consulting/:projectId/cashflow → Cash Flow tab
 *   /admin/consulting/:projectId/capex    → CAPEX tab
 */
import { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, MoreHorizontal, Star, X } from 'lucide-react'
import { useSetTopbar } from '@/components/layout/TopbarContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

interface ProjectMeta {
  name: string
  status: string
}

export function ProjectPage() {
  const { projectId } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { organization } = useAuth()
  const [project, setProject] = useState<ProjectMeta | null>(null)

  const orgId = organization?.id
  const base = `/admin/consulting/${projectId}`

  const TABS = [
    { label: 'Параметры', path: `${base}/edit` },
    { label: 'Сводка', path: `${base}/summary` },
    { label: 'Тех. карта', path: `${base}/techcard` },
    { label: 'Оборот стада', path: `${base}/herd` },
    { label: 'P&L', path: `${base}/pnl` },
    { label: 'Cash Flow', path: `${base}/cashflow` },
    { label: 'CAPEX', path: `${base}/capex` },
    { label: 'Штат', path: `${base}/staff` },
    { label: 'Рационы', path: `${base}/ration` },
  ]

  useEffect(() => {
    if (!orgId || !projectId) return
    supabase
      .rpc('rpc_get_consulting_project', {
        p_organization_id: orgId,
        p_project_id: projectId,
      })
      .then(({ data, error }) => {
        if (!error && data) {
          setProject({ name: data.name, status: data.status })
        }
      })
  }, [orgId, projectId])

  const headerContent = useMemo(() => (
    <div className="flex flex-col w-full">

      {/* Строка 1: навигация */}
      <div className="flex items-center h-10 px-3.5 gap-2" style={{ borderBottom: '1px solid var(--bd)' }}>
        <button
          onClick={() => navigate('/admin/consulting')}
          className="w-6 h-6 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          style={{ border: '1px solid var(--bd)', background: 'transparent' }}
        >
          <X className="w-2.5 h-2.5" />
        </button>

        <div className="flex gap-0.5">
          <button
            disabled
            className="w-6 h-6 rounded-[5px] flex items-center justify-center text-muted-foreground opacity-30"
            style={{ border: '1px solid var(--bd)', background: 'transparent' }}
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            disabled
            className="w-6 h-6 rounded-[5px] flex items-center justify-center text-muted-foreground opacity-30"
            style={{ border: '1px solid var(--bd)', background: 'transparent' }}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <span className="text-[12px] ml-1" style={{ color: 'var(--fg2)' }}>Инвестиционные проекты</span>

        <div className="ml-auto">
          <button
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            style={{ background: 'transparent', border: 'none' }}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Строка 2: заголовок */}
      <div className="flex items-center h-[54px] px-4 gap-2.5" style={{ borderBottom: '1px solid var(--bd)' }}>
        <div
          className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{ border: '1px solid var(--bd)', background: 'var(--bg-m)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="6" height="6" rx="1.5" fill="currentColor" opacity=".2"/>
            <rect x="10" y="2" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
            <rect x="2" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
            <rect x="10" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity=".85"/>
          </svg>
        </div>

        <h1 className="text-[17px] font-semibold tracking-[-0.015em]">
          {project?.name ?? '...'}
        </h1>

        <button
          className="text-muted-foreground hover:text-foreground transition-colors"
          style={{ background: 'transparent', border: 'none' }}
        >
          <Star className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Строка 3: табы */}
      <div
        className="flex items-stretch h-10 px-4 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--bd)', scrollbarWidth: 'none' }}
      >
        {TABS.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            className={({ isActive }) =>
              `flex items-center px-2.5 text-[13px] border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                isActive
                  ? 'font-medium border-foreground'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

    </div>
  ), [project, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  useSetTopbar({ headerContent })

  // Redirect bare /admin/consulting/:id → /admin/consulting/:id/summary
  if (pathname === base || pathname === `${base}/`) {
    return <Navigate to={`${base}/summary`} replace />
  }

  return (
    <div key={pathname} className="tab-content">
      <Outlet />
    </div>
  )
}
