import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type SidebarState = 'expanded' | 'collapsed' | 'hidden'
export type Theme = 'dark' | 'light'

export interface ShellContextValue {
  sidebar: SidebarState
  setSidebar: (s: SidebarState) => void
  cycleSidebar: () => void
  theme: Theme
  setTheme: (t: Theme) => void
  panelOpen: boolean
  setPanelOpen: (o: boolean) => void
  panelRecord: unknown
  openPanel: (record: unknown) => void
  closePanel: () => void
}

const ShellCtx = createContext<ShellContextValue | null>(null)

export function useShell() {
  const ctx = useContext(ShellCtx)
  if (!ctx) {
    throw new Error('useShell must be used within ShellProvider')
  }
  return ctx
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [sidebar, setSidebar] = useState<SidebarState>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('agos-sidebar') as SidebarState) || 'expanded'
    }
    return 'expanded'
  })

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agos-theme') as Theme | null
      if (saved) return saved
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return prefersDark ? 'dark' : 'light'
    }
    return 'dark'
  })

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelRecord, setPanelRecord] = useState<unknown>(null)

  const cycleSidebar = useCallback(() => {
    setSidebar((s) =>
      s === 'expanded' ? 'collapsed' : s === 'collapsed' ? 'hidden' : 'expanded'
    )
  }, [])

  const openPanel = useCallback((record: unknown) => {
    setPanelRecord(record)
    setPanelOpen(true)
  }, [])

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setPanelRecord(null)
  }, [])

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('agos-sidebar', sidebar)
  }, [sidebar])

  // Persist theme + apply to document
  useEffect(() => {
    localStorage.setItem('agos-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Global keyboard shortcuts: Cmd+B (sidebar), Cmd+] (panel)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'b') {
        e.preventDefault()
        cycleSidebar()
      }
      if (mod && e.key === ']') {
        e.preventDefault()
        setPanelOpen((p) => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cycleSidebar])

  const ctx: ShellContextValue = {
    sidebar,
    setSidebar,
    cycleSidebar,
    theme,
    setTheme,
    panelOpen,
    setPanelOpen,
    panelRecord,
    openPanel,
    closePanel,
  }

  return <ShellCtx.Provider value={ctx}>{children}</ShellCtx.Provider>
}
