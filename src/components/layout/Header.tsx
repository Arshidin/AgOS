import { useLocation, NavLink } from 'react-router-dom'
import { PanelLeft } from 'lucide-react'
import { useShell } from './ShellContext'
import { useTopbarConfig } from './TopbarContext'

/**
 * Route-to-title mapping.
 * Extend as new screens are added.
 */
const ROUTE_TITLES: Record<string, string> = {
  '/cabinet': 'Dashboard',
  '/cabinet/farm': 'Farm Profile',
  '/cabinet/herd': 'Herd',
  '/cabinet/vet/new': 'Report Sick Animal',
  '/cabinet/feed': 'Feed',
  '/admin': 'Admin Dashboard',
  '/admin/membership': 'Membership',
  '/admin/users': 'Users',
  '/admin/knowledge': 'Knowledge',
  '/admin/consulting': 'Консалтинг',
}

function getPageTitle(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]

  // Check for dynamic segments (e.g. /cabinet/vet/:caseId, /admin/membership/:id)
  if (pathname.startsWith('/cabinet/vet/') && pathname !== '/cabinet/vet/new') {
    return 'Vet Case'
  }
  if (pathname.startsWith('/admin/membership/')) {
    return 'Membership Decision'
  }
  // Consulting project pages use useSetTopbar — no fallback needed

  // Fallback: last segment, capitalized
  const segments = pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1] || 'Dashboard'
  return last.charAt(0).toUpperCase() + last.slice(1)
}

export function Header() {
  const { sidebar, cycleSidebar, panelOpen } = useShell()
  const location = useLocation()
  const { config } = useTopbarConfig()

  const title = config.title ?? getPageTitle(location.pathname)
  const tabs = config.tabs
  const actions = config.actions

  return (
    <header
      style={{
        gridColumn: panelOpen ? '2 / 3' : '2 / -1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        borderBottom: '1px solid var(--bd)',
        background: 'var(--bg)',
        height: 44,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {sidebar === 'hidden' && (
          <button
            onClick={cycleSidebar}
            title="Show sidebar"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              display: 'grid',
              placeItems: 'center',
              background: 'none',
              border: 'none',
              color: 'var(--fg3)',
              cursor: 'pointer',
              transition: 'all 80ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-m)'
              e.currentTarget.style.color = 'var(--fg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.color = 'var(--fg3)'
            }}
          >
            <PanelLeft size={15} />
          </button>
        )}
        <h1 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</h1>

        {tabs && tabs.length > 0 && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end
                style={({ isActive }) => ({
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '4px 10px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: isActive ? 'var(--fg)' : 'var(--fg3)',
                  background: isActive ? 'var(--bg-m)' : 'none',
                  transition: 'all 80ms',
                })}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {actions}
      </div>
    </header>
  )
}
