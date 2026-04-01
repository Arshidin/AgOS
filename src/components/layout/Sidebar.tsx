import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useShell } from './ShellContext'
import {
  LayoutDashboard,
  Leaf,
  Fence,
  Stethoscope,
  Wheat,
  Users,
  BookOpen,
  Calculator,
  ClipboardList,
  Syringe,
  Shield,
  FileText,
  Activity,
  BarChart3,
  PanelLeftClose,
  Search,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ---- Turan Star SVG ---- */
function TuranStar({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <g transform="translate(16,16)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line
            key={a}
            x1="0"
            y1="-3"
            x2="0"
            y2="-13"
            stroke="var(--accent, #E8920B)"
            strokeWidth="2.8"
            strokeLinecap="round"
            transform={`rotate(${a})`}
          />
        ))}
        <circle cx="0" cy="0" r="2.5" fill="var(--accent, #E8920B)" />
      </g>
    </svg>
  )
}

/* ---- Nav definitions per role ---- */
interface NavItem {
  id: string
  icon: LucideIcon
  label: string
  route: string
}

const FARMER_NAV: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', route: '/cabinet' },
  { id: 'farm', icon: Leaf, label: 'Farm', route: '/cabinet/farm' },
  { id: 'herd', icon: Fence, label: 'Herd', route: '/cabinet/herd' },
  { id: 'vet', icon: Stethoscope, label: 'Vet', route: '/cabinet/vet' },
  { id: 'feed', icon: Wheat, label: 'Feed', route: '/cabinet/feed' },
  { id: 'ration', icon: Calculator, label: 'Ration', route: '/cabinet/ration' },
  { id: 'plan', icon: ClipboardList, label: 'Plan', route: '/cabinet/plan' },
]

const EXPERT_NAV: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', route: '/admin' },
  { id: 'vet-queue', icon: Stethoscope, label: 'Vet Cases', route: '/admin/expert/queue' },
  { id: 'vaccination', icon: Syringe, label: 'Vaccination', route: '/admin/expert/vaccination' },
  { id: 'epidemic', icon: Activity, label: 'Epidemic', route: '/admin/expert/epidemic' },
  { id: 'expert-kpi', icon: BarChart3, label: 'Expert KPI', route: '/admin/expert/kpi' },
]

const ADMIN_NAV: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', route: '/admin' },
  { id: 'membership', icon: Users, label: 'Membership', route: '/admin/membership' },
  { id: 'vet-queue', icon: Stethoscope, label: 'Vet Cases', route: '/admin/expert/queue' },
  { id: 'vaccination', icon: Syringe, label: 'Vaccination', route: '/admin/expert/vaccination' },
  { id: 'epidemic', icon: Activity, label: 'Epidemic', route: '/admin/expert/epidemic' },
  { id: 'expert-kpi', icon: BarChart3, label: 'Expert KPI', route: '/admin/expert/kpi' },
  { id: 'knowledge', icon: BookOpen, label: 'Knowledge', route: '/admin/knowledge' },
  { id: 'restrictions', icon: Shield, label: 'Restrictions', route: '/admin/restrictions' },
  { id: 'audit', icon: FileText, label: 'Audit', route: '/admin/audit' },
]

/* ---- Icon button helper ---- */
function IconBtn({
  onClick,
  title,
  ariaLabel,
  children,
}: {
  onClick: () => void
  title?: string
  ariaLabel?: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
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
      {children}
    </button>
  )
}

export function Sidebar() {
  const { sidebar, cycleSidebar, theme, setTheme } = useShell()
  const { userContext, signOut, role } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isExpanded = sidebar === 'expanded'
  const isCollapsed = sidebar === 'collapsed'

  // Pick nav items based on current route prefix and role
  const isAdminSection = location.pathname.startsWith('/admin')
  // Show full admin nav only to admins; experts see expert-only nav
  const isAdmin = role === 'admin'
  const navItems = isAdminSection ? (isAdmin ? ADMIN_NAV : EXPERT_NAV) : FARMER_NAV

  // Determine active nav item
  const getIsActive = (item: NavItem) => {
    if (item.route === '/cabinet' || item.route === '/admin') {
      return location.pathname === item.route
    }
    return location.pathname.startsWith(item.route)
  }

  // User initials
  const fullName = userContext?.full_name || ''
  const initials = fullName
    ? fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (role || 'U').slice(0, 2).toUpperCase()

  const displayName = fullName || userContext?.phone || 'User'
  const displayRole = isAdminSection ? 'Admin' : (role || 'farmer')

  if (sidebar === 'hidden') {
    return <div style={{ gridRow: '1 / -1' }} />
  }

  return (
    <aside
      style={{
        gridRow: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-s)',
        borderRight: '1px solid var(--bd)',
        overflow: 'hidden',
      }}
    >
      {/* Workspace header */}
      <div
        style={{
          padding: isExpanded ? '14px 14px 10px' : '14px 10px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
      >
        <TuranStar size={isExpanded ? 28 : 24} />
        {isExpanded && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                AgOS
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg3)', marginTop: -1 }}>
                TURAN
              </div>
            </div>
            <IconBtn onClick={cycleSidebar} title="Collapse Cmd+B" ariaLabel="Collapse sidebar">
              <PanelLeftClose size={15} />
            </IconBtn>
          </>
        )}
      </div>

      {/* Search trigger */}
      {isExpanded && (
        <div style={{ padding: '8px 10px 4px' }}>
          <button
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 6,
              background: 'var(--bg-c)',
              border: '1px solid var(--bd)',
              color: 'var(--fg3)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 100ms',
            }}
          >
            <Search size={13} strokeWidth={2} />
            <span style={{ flex: 1, textAlign: 'left' }}>Search...</span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 3,
                background: 'var(--bg)',
                border: '1px solid var(--bd)',
                color: 'var(--fg3)',
                fontFamily: 'inherit',
              }}
            >
              Cmd+K
            </span>
          </button>
        </div>
      )}
      {isCollapsed && (
        <div style={{ padding: '8px 0 4px', display: 'flex', justifyContent: 'center' }}>
          <IconBtn onClick={() => {}} title="Search Cmd+K">
            <Search size={15} />
          </IconBtn>
        </div>
      )}

      {/* Navigation */}
      <nav
        style={{
          padding: isExpanded ? '4px 8px' : '4px 6px',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = getIsActive(item)

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              title={isCollapsed ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                borderRadius: 6,
                background: isActive ? 'rgba(255,255,255,0.04)' : 'none',
                border: isActive ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                color: isActive ? 'var(--fg)' : 'var(--fg2)',
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 80ms',
                marginBottom: 1,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '7px' : '7px 10px',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-m)'
                  e.currentTarget.style.color = 'var(--fg)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = 'var(--fg2)'
                }
              }}
            >
              <Icon
                size={16}
                strokeWidth={isActive ? 1.8 : 1.5}
                style={{ color: isActive ? 'var(--fg)' : 'var(--fg3)' }}
              />
              {isExpanded && (
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--bd)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9999,
            background: 'var(--cta)',
            color: 'var(--cta-fg)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        {isExpanded && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg3)', marginTop: -1 }}>
                {displayRole}
              </div>
            </div>
            <IconBtn
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
              ariaLabel="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </IconBtn>
            <IconBtn onClick={() => signOut()} title="Sign out" ariaLabel="Sign out">
              <LogOut size={14} />
            </IconBtn>
          </>
        )}
      </div>
    </aside>
  )
}
