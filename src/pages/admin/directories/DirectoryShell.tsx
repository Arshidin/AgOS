/**
 * useDirectoryTopbar — shared hook for all directory pages.
 * Replaces useSetTopbar with a 3-row consulting-style topbar:
 *   Row 1: [X] close → hub | [↑↓] prev/next | "N из M справочников"
 *   Row 2: icon box + title
 *   Row 3: tabs with icons (omitted when tabs=[])
 *
 * Canonical directory order is defined in DIRECTORY_LIST below
 * and MUST match the order in DirectoriesHub.tsx.
 */
import { useEffect, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, MoreHorizontal, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTopbarConfig } from '@/components/layout/TopbarContext'

export interface DirectoryTab {
  label: string
  path: string
  icon: LucideIcon
}

interface DirectoryEntry {
  id: string
  firstRoute: string
}

// Canonical order — MUST match DirectoriesHub DIRECTORIES list
const DIRECTORY_LIST: DirectoryEntry[] = [
  { id: 'feeds',            firstRoute: '/admin/directories/feeds/catalog' },
  { id: 'capex',            firstRoute: '/admin/directories/capex/materials' },
  { id: 'livestock-prices', firstRoute: '/admin/directories/livestock-prices' },
  { id: 'regions',          firstRoute: '/admin/directories/regions' },
  { id: 'norms',            firstRoute: '/admin/directories/norms/facilities' },
]

interface UseDirectoryTopbarOptions {
  directoryId: string
  title: string
  Icon: LucideIcon
  tabs?: DirectoryTab[]
}

export function useDirectoryTopbar({
  directoryId,
  title,
  Icon,
  tabs = [],
}: UseDirectoryTopbarOptions) {
  const navigate = useNavigate()
  const { setConfig, clearConfig } = useTopbarConfig()

  const headerContent = useMemo(() => {
    const idx = DIRECTORY_LIST.findIndex(d => d.id === directoryId)
    const prev = idx > 0 ? DIRECTORY_LIST[idx - 1]! : null
    const next = idx < DIRECTORY_LIST.length - 1 ? DIRECTORY_LIST[idx + 1]! : null

    const navBtnStyle = (enabled: boolean): React.CSSProperties => ({
      border: '1px solid var(--bd)',
      background: 'transparent',
      color: 'var(--fg3)',
      opacity: enabled ? 1 : 0.3,
      cursor: enabled ? 'pointer' : 'default',
    })

    return (
      <div className="flex flex-col w-full">

        {/* Row 1: navigation */}
        <div
          className="flex items-center h-10 px-3.5 gap-2"
          style={{ borderBottom: '1px solid var(--bd)' }}
        >
          <button
            onClick={() => navigate('/admin/directories')}
            className="w-6 h-6 rounded-[5px] flex items-center justify-center hover:bg-muted transition-colors"
            style={{ border: '1px solid var(--bd)', background: 'transparent', color: 'var(--fg3)' }}
          >
            <X className="w-2.5 h-2.5" />
          </button>

          <div className="flex gap-0.5">
            <button
              onClick={() => prev && navigate(prev.firstRoute)}
              disabled={!prev}
              className="w-6 h-6 rounded-[5px] flex items-center justify-center"
              style={navBtnStyle(!!prev)}
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => next && navigate(next.firstRoute)}
              disabled={!next}
              className="w-6 h-6 rounded-[5px] flex items-center justify-center"
              style={navBtnStyle(!!next)}
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <span className="text-[12px] ml-1" style={{ color: 'var(--fg2)' }}>
            {idx + 1} из {DIRECTORY_LIST.length} справочников
          </span>

          <div className="ml-auto">
            <button
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
              style={{ background: 'transparent', border: 'none', color: 'var(--fg3)' }}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: title */}
        <div
          className="flex items-center h-[54px] px-4 gap-2.5"
          style={{ borderBottom: tabs.length > 0 ? '1px solid var(--bd)' : undefined }}
        >
          <div
            className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{ border: '1px solid var(--bd)', background: 'var(--bg-m)', color: 'var(--accent)' }}
          >
            <Icon size={18} />
          </div>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', color: 'var(--fg)' }}>
            {title}
          </h1>
        </div>

        {/* Row 3: tabs (only when directory has sub-sections) */}
        {tabs.length > 0 && (
          <div
            className="flex items-stretch h-10 px-4 overflow-x-auto"
            style={{ borderBottom: '1px solid var(--bd)', scrollbarWidth: 'none' }}
          >
            {tabs.map(tab => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 text-[13px] border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                    isActive
                      ? 'font-medium border-foreground'
                      : 'border-transparent hover:text-foreground'
                  }`
                }
                style={({ isActive }) => ({ color: isActive ? 'var(--fg)' : 'var(--fg2)' })}
              >
                <tab.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {tab.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directoryId, title, Icon, tabs, navigate])

  useEffect(() => {
    setConfig({ headerContent })
    return () => clearConfig()
  }, [headerContent, setConfig, clearConfig])
}
