import { useLocation } from 'react-router-dom'
import { PanelLeft } from 'lucide-react'
import { useShell } from './ShellContext'

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

  // Fallback: last segment, capitalized
  const segments = pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1] || 'Dashboard'
  return last.charAt(0).toUpperCase() + last.slice(1)
}

export function Header() {
  const { sidebar, cycleSidebar, panelOpen } = useShell()
  const location = useLocation()

  const title = getPageTitle(location.pathname)

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
      </div>

      {/* Right side: placeholder for future tabs, filter, export, CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Buttons will be added per-screen via Dok 6 contracts */}
      </div>
    </header>
  )
}
