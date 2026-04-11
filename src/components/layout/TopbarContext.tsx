import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export interface TopbarTab {
  label: string
  path: string
}

export interface TopbarConfig {
  title?: string
  titleIcon?: ReactNode
  titleLoading?: boolean
  tabs?: TopbarTab[]
  actions?: ReactNode
  headerContent?: ReactNode
}

interface TopbarCtxValue {
  config: TopbarConfig
  setConfig: (config: TopbarConfig) => void
  clearConfig: () => void
}

const TopbarCtx = createContext<TopbarCtxValue | null>(null)

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<TopbarConfig>({})

  const setConfig = useCallback((next: TopbarConfig) => {
    setConfigState(next)
  }, [])

  const clearConfig = useCallback(() => {
    setConfigState({})
  }, [])

  return (
    <TopbarCtx.Provider value={{ config, setConfig, clearConfig }}>
      {children}
    </TopbarCtx.Provider>
  )
}

export function useTopbarConfig() {
  const ctx = useContext(TopbarCtx)
  if (!ctx) throw new Error('useTopbarConfig must be used within TopbarProvider')
  return ctx
}

/**
 * Call this hook at the top of a page component to declare
 * per-page topbar title, tabs, and action buttons.
 *
 * Example:
 *   useSetTopbar({
 *     title: 'Farm Profile',
 *     actions: <button onClick={openSheet}>Edit</button>,
 *   })
 */
export function useSetTopbar(config: TopbarConfig) {
  const { setConfig, clearConfig } = useTopbarConfig()

  useEffect(() => {
    setConfig(config)
    return () => clearConfig()
    // Intentionally omitting config from deps — callers should memoize if dynamic
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setConfig, clearConfig])
}
