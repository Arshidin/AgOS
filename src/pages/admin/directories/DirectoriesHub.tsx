/**
 * /admin/directories — Справочники (hub page)
 * Lists all reference directories. Navigation: hub → directory → tabs.
 * Pattern mirrors ConsultingDashboard (list of items → detail with tabs).
 */
import { useNavigate } from 'react-router-dom'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useSetTopbar } from '@/components/layout/TopbarContext'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FlaskConical,
  Building2,
  DollarSign,
  MapPin,
  ClipboardList,
  ChevronRight,
  Library,
} from 'lucide-react'

// ─── Directory definitions ────────────────────────────────────────────────────

interface DirectoryCard {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  route: string
  badge?: string
}

const DIRECTORIES: DirectoryCard[] = [
  {
    id: 'feeds',
    icon: <FlaskConical size={22} />,
    title: 'Кормовая база',
    description: 'Каталог кормов, нормы кормления, цены по регионам',
    route: '/admin/directories/feeds/catalog',
    badge: '3 таба',
  },
  {
    id: 'capex',
    icon: <Building2 size={22} />,
    title: 'Инфраструктура',
    description: 'Материалы строительства, нормативы CAPEX, надбавки',
    route: '/admin/directories/capex/materials',
    badge: '3 таба',
  },
  {
    id: 'livestock-prices',
    icon: <DollarSign size={22} />,
    title: 'Цены КРС',
    description: 'Справочник цен продажи крупного рогатого скота',
    route: '/admin/directories/livestock-prices',
  },
  {
    id: 'regions',
    icon: <MapPin size={22} />,
    title: 'Регионы',
    description: 'Справочник регионов Казахстана',
    route: '/admin/directories/regions',
  },
  {
    id: 'norms',
    icon: <ClipboardList size={22} />,
    title: 'Нормативы',
    description: 'НТС-КРС: помещения, площадки, сценарии отёла, пастбища, коэффициенты CAPEX',
    route: '/admin/directories/norms/facilities',
    badge: '5 табов',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function DirectoriesHub() {
  const { isAdmin, checking } = useAdminGuard()
  const navigate = useNavigate()

  useSetTopbar({
    title: 'Справочники',
    titleIcon: <Library size={15} />,
  })

  if (checking) {
    return (
      <div className="page">
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (!isAdmin) return null

  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 12,
          maxWidth: 960,
        }}
      >
        {DIRECTORIES.map((dir) => (
          <DirectoryCardItem
            key={dir.id}
            dir={dir}
            onClick={() => navigate(dir.route)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function DirectoryCardItem({
  dir,
  onClick,
}: {
  dir: DirectoryCard
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '18px 20px',
        background: 'var(--bg)',
        border: '1px solid var(--bd)',
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 150ms, background 150ms',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--bd-h)'
        e.currentTarget.style.background = 'var(--bg-s)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--bd)'
        e.currentTarget.style.background = 'var(--bg)'
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: 'var(--bg-m)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--accent)',
          flexShrink: 0,
        }}
      >
        {dir.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--fg)',
              lineHeight: 1.3,
            }}
          >
            {dir.title}
          </span>
          {dir.badge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--fg3)',
                background: 'var(--bg-m)',
                borderRadius: 4,
                padding: '1px 6px',
                flexShrink: 0,
              }}
            >
              {dir.badge}
            </span>
          )}
        </div>
        <p
          style={{
            fontSize: 12,
            color: 'var(--fg3)',
            margin: 0,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {dir.description}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight size={16} style={{ color: 'var(--fg3)', flexShrink: 0 }} />
    </button>
  )
}
