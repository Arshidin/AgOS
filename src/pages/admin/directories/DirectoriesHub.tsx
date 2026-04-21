/**
 * /admin/directories — Справочники (hub page)
 * Table format matching ConsultingDashboard.
 * Navigation: hub → directory → tabs inside directory.
 */
import { useNavigate } from 'react-router-dom'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useSetTopbar } from '@/components/layout/TopbarContext'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FlaskConical,
  Building2,
  Banknote,
  MapPin,
  ClipboardList,
  ArrowRight,
  ChevronDown,
  LayoutGrid,
  Library,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Directory definitions ────────────────────────────────────────────────────

interface DirectoryDef {
  id: string
  Icon: LucideIcon
  title: string
  description: string
  firstRoute: string
  sections: number
}

// Canonical order — MUST match DIRECTORY_LIST in DirectoryShell.tsx
const DIRECTORIES: DirectoryDef[] = [
  {
    id: 'feeds',
    Icon: FlaskConical,
    title: 'Кормовая база',
    description: 'Каталог кормов, нормы кормления, цены по регионам',
    firstRoute: '/admin/directories/feeds/catalog',
    sections: 3,
  },
  {
    id: 'capex',
    Icon: Building2,
    title: 'Инфраструктура',
    description: 'Материалы строительства, нормативы CAPEX, надбавки',
    firstRoute: '/admin/directories/capex/materials',
    sections: 3,
  },
  {
    id: 'livestock-prices',
    Icon: Banknote,
    title: 'Цены КРС',
    description: 'Справочник цен продажи крупного рогатого скота',
    firstRoute: '/admin/directories/livestock-prices',
    sections: 0,
  },
  {
    id: 'regions',
    Icon: MapPin,
    title: 'Регионы',
    description: 'Справочник регионов Казахстана',
    firstRoute: '/admin/directories/regions',
    sections: 0,
  },
  {
    id: 'norms',
    Icon: ClipboardList,
    title: 'Нормативы',
    description: 'НТС-КРС: помещения, площадки, сценарии, пастбища, коэффициенты',
    firstRoute: '/admin/directories/norms/facilities',
    sections: 5,
  },
]

function pluralRazdel(n: number): string {
  if (n === 0) return '—'
  if (n === 1) return '1 раздел'
  if (n <= 4) return `${n} раздела`
  return `${n} разделов`
}

const COL_TEMPLATE = 'minmax(280px,3fr) 140px'

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
        <div className="flex flex-col border border-border/60 rounded-[8px] overflow-hidden bg-background">
          <div className="flex items-center h-10 px-4 border-b border-border/60">
            <Skeleton className="h-[26px] w-36 rounded-md" />
          </div>
          <div className="grid border-b border-border/60 bg-muted/40" style={{ gridTemplateColumns: COL_TEMPLATE }}>
            {[280, 140].map((w, i) => (
              <div key={i} className="h-[34px] px-3 flex items-center border-r border-border/60 last:border-r-0">
                <Skeleton className="h-3" style={{ width: w * 0.35 }} />
              </div>
            ))}
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="grid border-b border-border/60" style={{ gridTemplateColumns: COL_TEMPLATE }}>
              <div className="h-[48px] px-3 flex items-center gap-2.5 border-r border-border/60">
                <Skeleton className="w-[28px] h-[28px] rounded-[7px] flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-48" />
                </div>
              </div>
              <div className="h-[48px] px-3 flex items-center">
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="page">
      <div className="flex flex-col border border-border/60 rounded-[8px] overflow-hidden bg-background">

        {/* ── Toolbar ── */}
        <div className="flex items-center h-10 px-4 border-b border-border/60 gap-2">
          <div
            className="h-[26px] px-2.5 rounded-md border border-border/60 text-[12px] flex items-center gap-1.5 cursor-pointer select-none"
            style={{ color: 'var(--fg)' }}
          >
            <LayoutGrid className="w-3 h-3 opacity-50" />
            Все справочники
            <ChevronDown className="w-3 h-3 opacity-40 ml-0.5" />
          </div>
        </div>

        {/* ── Table header ── */}
        <div
          className="grid border-b border-border/60 bg-muted/40"
          style={{ gridTemplateColumns: COL_TEMPLATE }}
        >
          <div className="h-[34px] px-3 flex items-center text-[11px] font-medium text-muted-foreground border-r border-border/60">
            Справочник
          </div>
          <div className="h-[34px] px-3 flex items-center text-[11px] font-medium text-muted-foreground">
            Разделы
          </div>
        </div>

        {/* ── Rows ── */}
        {DIRECTORIES.map(dir => (
          <div
            key={dir.id}
            onClick={() => navigate(dir.firstRoute)}
            className="grid border-b border-border/60 cursor-pointer hover:bg-muted/40 transition-colors group"
            style={{ gridTemplateColumns: COL_TEMPLATE }}
          >
            {/* Directory name + description */}
            <div className="h-[48px] px-3 flex items-center gap-2.5 border-r border-border/60 min-w-0">
              <div
                className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--bg-s)', color: 'var(--accent)' }}
              >
                <dir.Icon size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium" style={{ color: 'var(--fg)' }}>
                    {dir.title}
                  </span>
                  <ArrowRight
                    className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity ml-auto flex-shrink-0"
                    style={{ color: 'var(--fg3)' }}
                  />
                </div>
                <p className="text-[11px] truncate m-0" style={{ color: 'var(--fg3)' }}>
                  {dir.description}
                </p>
              </div>
            </div>

            {/* Sections count */}
            <div className="h-[48px] px-3 flex items-center">
              <span className="text-[12px] text-muted-foreground">
                {pluralRazdel(dir.sections)}
              </span>
            </div>
          </div>
        ))}

        {/* ── Footer ── */}
        <div className="grid bg-muted/40" style={{ gridTemplateColumns: COL_TEMPLATE }}>
          <div className="h-[28px] px-3 flex items-center">
            <span className="text-[11px] text-muted-foreground">
              <span className="font-medium" style={{ color: 'var(--fg)' }}>{DIRECTORIES.length}</span> справочников
            </span>
          </div>
          <div className="h-[28px]" />
        </div>

      </div>
    </div>
  )
}
