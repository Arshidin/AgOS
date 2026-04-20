import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  ShoppingCart,
  Package,
  DollarSign,
  UserCog,
  Building2,
  MapPin,
  Settings,
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
  Briefcase,
  FlaskConical,
  User,
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

/* ---- Nav types ---- */
interface NavItem {
  id: string
  icon: LucideIcon
  label: string
  route: string
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

/* ---- Grouped nav definitions per role ---- */

const FARMER_GROUPS: NavGroup[] = [
  {
    label: 'Основное',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Главная', route: '/cabinet' },
      { id: 'farm', icon: Leaf, label: 'Ферма', route: '/cabinet/farm' },
    ],
  },
  {
    label: 'Поголовье',
    items: [
      { id: 'herd', icon: Fence, label: 'Стадо', route: '/cabinet/herd' },
      { id: 'vet', icon: Stethoscope, label: 'Ветеринария', route: '/cabinet/vet' },
      { id: 'feed', icon: Wheat, label: 'Корма', route: '/cabinet/feed' },
      { id: 'ration', icon: Calculator, label: 'Рацион', route: '/cabinet/ration' },
    ],
  },
  {
    label: 'Бизнес',
    items: [
      { id: 'plan', icon: ClipboardList, label: 'Планирование', route: '/cabinet/plan' },
      { id: 'market', icon: ShoppingCart, label: 'Рынок', route: '/cabinet/market' },
    ],
  },
]

const EXPERT_GROUPS: NavGroup[] = [
  {
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Главная', route: '/admin' },
    ],
  },
  {
    label: 'Клиника',
    items: [
      { id: 'vet-queue', icon: Stethoscope, label: 'Вет. кейсы', route: '/admin/expert/queue' },
      { id: 'vaccination', icon: Syringe, label: 'Вакцинация', route: '/admin/expert/vaccination' },
      { id: 'epidemic', icon: Activity, label: 'Эпидемиология', route: '/admin/expert/epidemic' },
    ],
  },
  {
    label: 'Аналитика',
    items: [
      { id: 'expert-kpi', icon: BarChart3, label: 'Мои показатели', route: '/admin/expert/kpi' },
    ],
  },
]

const ADMIN_GROUPS: NavGroup[] = [
  {
    label: 'Участники',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Главная', route: '/admin' },
      { id: 'applications', icon: FileText, label: 'Заявки', route: '/admin/applications' },
      { id: 'users', icon: UserCog, label: 'Пользователи', route: '/admin/users' },
      { id: 'roles', icon: Users, label: 'Роли', route: '/admin/roles' },
      { id: 'orgs', icon: Building2, label: 'Организации', route: '/admin/orgs' },
    ],
  },
  {
    label: 'Клиника',
    items: [
      { id: 'vet-queue', icon: Stethoscope, label: 'Вет. кейсы', route: '/admin/expert/queue' },
      { id: 'vaccination', icon: Syringe, label: 'Вакцинация', route: '/admin/expert/vaccination' },
      { id: 'epidemic', icon: Activity, label: 'Эпидемиология', route: '/admin/expert/epidemic' },
      { id: 'expert-kpi', icon: BarChart3, label: 'KPI эксперта', route: '/admin/expert/kpi' },
      { id: 'restrictions', icon: Shield, label: 'Ограничения', route: '/admin/restrictions' },
    ],
  },
  {
    label: 'Платформа',
    items: [
      { id: 'knowledge', icon: BookOpen, label: 'База знаний', route: '/admin/knowledge' },
      { id: 'audit', icon: FileText, label: 'Аудит', route: '/admin/audit' },
      { id: 'pools', icon: Package, label: 'Пулы', route: '/admin/pools' },
      { id: 'pricing', icon: DollarSign, label: 'Цены', route: '/admin/pricing' },
      { id: 'regions', icon: MapPin, label: 'Регионы', route: '/admin/regions' },
      { id: 'settings', icon: Settings, label: 'Настройки', route: '/admin/settings' },
      { id: 'feeds', icon: FlaskConical, label: 'Кормовая база', route: '/admin/feeds' },
      { id: 'capex', icon: Building2, label: 'Инфраструктура', route: '/admin/capex' },
      { id: 'livestock-prices', icon: DollarSign, label: 'Цены КРС', route: '/admin/livestock-prices' },
      { id: 'consulting', icon: Briefcase, label: 'Консалтинг', route: '/admin/consulting' },
    ],
  },
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
  const [focused, setFocused] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        display: 'grid',
        placeItems: 'center',
        background: 'none',
        border: 'none',
        outline: 'none',
        color: 'var(--fg3)',
        cursor: 'pointer',
        transition: 'background-color 150ms cubic-bezier(0.16,1,0.3,1), color 150ms cubic-bezier(0.16,1,0.3,1), box-shadow 150ms cubic-bezier(0.16,1,0.3,1)',
        boxShadow: focused ? '0 0 0 2px var(--bd-h)' : 'none',
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

  const isAdminSection = location.pathname.startsWith('/admin')
  const { isAdmin: isAdminRole } = useAuth()
  const navGroups = isAdminSection
    ? (isAdminRole ? ADMIN_GROUPS : EXPERT_GROUPS)
    : FARMER_GROUPS

  const getIsActive = (item: NavItem) => {
    if (item.route === '/cabinet' || item.route === '/admin') {
      return location.pathname === item.route
    }
    return location.pathname.startsWith(item.route)
  }

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

  /* ---- Footer dropdown ---- */
  const footerRef = useRef<HTMLDivElement>(null)
  const [footerOpen, setFooterOpen] = useState(false)

  useEffect(() => {
    if (!footerOpen) return
    function onPointerDown(e: PointerEvent) {
      if (footerRef.current && !footerRef.current.contains(e.target as Node)) {
        setFooterOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFooterOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [footerOpen])

  const footerActions = [
    {
      label: 'Профиль',
      icon: User,
      destructive: false,
      action: () => {
        navigate(isAdminSection ? '/cabinet' : '/cabinet/farm')
        setFooterOpen(false)
      },
    },
    {
      label: 'Настройки',
      icon: Settings,
      destructive: false,
      action: () => {
        if (isAdminRole) navigate('/admin/settings')
        setFooterOpen(false)
      },
    },
    {
      label: 'Выйти',
      icon: LogOut,
      destructive: true,
      action: () => {
        signOut()
        setFooterOpen(false)
      },
    },
  ]

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
          padding: isExpanded ? '12px 10px 8px' : '12px 8px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
      >
        <TuranStar size={24} />
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
              <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: -1 }}>
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
              padding: '6px 10px',
              borderRadius: 6,
              background: 'var(--bg-c)',
              border: '1px solid var(--bd)',
              outline: 'none',
              color: 'var(--fg3)',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background-color 150ms cubic-bezier(0.16,1,0.3,1), color 150ms cubic-bezier(0.16,1,0.3,1), box-shadow 150ms cubic-bezier(0.16,1,0.3,1)',
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--bd-h)' }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
          >
            <Search size={13} strokeWidth={2} />
            <span style={{ flex: 1, textAlign: 'left' }}>Search...</span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 4,
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

      {/* Navigation — grouped */}
      <nav
        style={{
          padding: isExpanded ? '8px' : '8px 4px',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {/* Group label (expanded only) */}
            {group.label && isExpanded && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--fg3)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: gi === 0 ? '8px 10px 6px' : '16px 10px 6px',
                  userSelect: 'none',
                }}
              >
                {group.label}
              </div>
            )}

            {/* Nav items */}
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = getIsActive(item)

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.route)}
                  title={isCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderRadius: 6,
                    background: isActive ? 'var(--bg-m)' : 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: isActive ? 'var(--fg)' : 'var(--fg2)',
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background-color 150ms cubic-bezier(0.16,1,0.3,1), color 150ms cubic-bezier(0.16,1,0.3,1), box-shadow 150ms cubic-bezier(0.16,1,0.3,1)',
                    marginBottom: 2,
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    padding: isCollapsed ? '6px' : '6px 10px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--bg-m)'
                      e.currentTarget.style.color = 'var(--fg)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--fg2)'
                    }
                  }}
                  onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--bd-h)' }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
                >
                  <Icon
                    size={16}
                    strokeWidth={1.5}
                    style={{ color: isActive ? 'var(--fg)' : 'var(--fg3)' }}
                  />
                  {isExpanded && (
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: '8px',
          borderTop: '1px solid var(--bd)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          justifyContent: isCollapsed ? 'center' : 'space-between',
        }}
      >
        {/* Clickable user info block */}
        <div
          ref={footerRef}
          role="button"
          tabIndex={0}
          aria-label="User menu"
          onClick={() => setFooterOpen((v) => !v)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFooterOpen((v) => !v) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: isExpanded ? 1 : 'none',
            minWidth: 0,
            padding: '4px 6px',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'background-color 150ms cubic-bezier(0.16,1,0.3,1)',
            background: footerOpen ? 'var(--bg-m)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!footerOpen) e.currentTarget.style.background = 'var(--bg-m)'
          }}
          onMouseLeave={(e) => {
            if (!footerOpen) e.currentTarget.style.background = 'none'
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: -1 }}>
                {displayRole}
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle — preserved outside the dropdown trigger */}
        {isExpanded && (
          <IconBtn
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            ariaLabel="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </IconBtn>
        )}
      </div>

      {/* Footer dropdown portal */}
      {footerOpen && footerRef.current && createPortal(
        (() => {
          const rect = footerRef.current!.getBoundingClientRect()
          return (
            <div
              style={{
                position: 'fixed',
                bottom: window.innerHeight - rect.top + 4,
                left: rect.left,
                minWidth: 168,
                background: 'var(--bg-c)',
                border: '1px solid var(--bd)',
                borderRadius: 8,
                boxShadow: 'var(--sh-md)',
                overflow: 'hidden',
                zIndex: 100,
              }}
            >
              {footerActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    onClick={action.action}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: action.destructive ? 'var(--red)' : 'var(--fg2)',
                      fontSize: 13,
                      fontWeight: 400,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      transition: 'background-color 150ms cubic-bezier(0.16,1,0.3,1), color 150ms cubic-bezier(0.16,1,0.3,1), box-shadow 150ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-m)'
                      if (!action.destructive) e.currentTarget.style.color = 'var(--fg)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none'
                      e.currentTarget.style.color = action.destructive ? 'var(--red)' : 'var(--fg2)'
                    }}
                    onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--bd-h)' }}
                    onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <Icon size={14} strokeWidth={1.5} />
                    {action.label}
                  </button>
                )
              })}
            </div>
          )
        })(),
        document.body
      )}
    </aside>
  )
}
