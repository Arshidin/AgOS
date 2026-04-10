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
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useSetTopbar } from '@/components/layout/TopbarContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function ProjectPage() {
  const { projectId } = useParams()
  const { pathname } = useLocation()
  const { organization } = useAuth()
  const [projectName, setProjectName] = useState<string>('Проект')

  const orgId = organization?.id
  const base = `/admin/consulting/${projectId}`

  // Load project name for topbar title
  useEffect(() => {
    if (!orgId || !projectId) return
    supabase
      .rpc('rpc_get_consulting_project', {
        p_organization_id: orgId,
        p_project_id: projectId,
      })
      .then(({ data }) => {
        if (data?.name) setProjectName(data.name)
      })
  }, [orgId, projectId])

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

  useSetTopbar({ title: projectName, tabs: TABS })

  // Redirect bare /admin/consulting/:id → /admin/consulting/:id/summary
  if (pathname === base || pathname === `${base}/`) {
    return <Navigate to={`${base}/summary`} replace />
  }

  return <Outlet />
}
