/**
 * Ration section container — sets 4-tab topbar navigation
 * Routes:
 *   /cabinet/ration             → redirect → /cabinet/ration/groups
 *   /cabinet/ration/calculator  → quick NASEM calculator (not saved)
 *   /cabinet/ration/groups      → farm rations per herd group
 *   /cabinet/ration/summary     → aggregated farm summary
 *   /cabinet/ration/budget      → feed stock vs demand + budget
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSetTopbar } from '@/components/layout/TopbarContext'

const TABS = [
  { label: 'Калькулятор', path: '/cabinet/ration/calculator' },
  { label: 'Рационы фермы', path: '/cabinet/ration/groups' },
  { label: 'Сводный', path: '/cabinet/ration/summary' },
  { label: 'Бюджет кормов', path: '/cabinet/ration/budget' },
]

export function RationPage() {
  const { pathname } = useLocation()

  useSetTopbar({ title: 'Рационы', tabs: TABS })

  // Redirect bare /cabinet/ration → /cabinet/ration/groups
  if (pathname === '/cabinet/ration' || pathname === '/cabinet/ration/') {
    return <Navigate to="/cabinet/ration/groups" replace />
  }

  return <Outlet />
}
