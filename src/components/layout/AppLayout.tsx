import { Outlet } from 'react-router-dom'
import { ShellProvider, useShell } from './ShellContext'
import { TopbarProvider, useTopbarConfig } from './TopbarContext'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { DetailPanel } from './DetailPanel'

function ShellGrid() {
  const { sidebar, panelOpen, theme } = useShell()
  const { config } = useTopbarConfig()

  const sidebarWidth =
    sidebar === 'expanded' ? 240 : sidebar === 'collapsed' ? 56 : 0

  const gridTemplateRows = config.headerContent ? 'auto 1fr' : '44px 1fr'

  return (
    <div
      data-shell=""
      data-theme={theme}
      style={{
        display: 'grid',
        gridTemplateColumns: `${sidebarWidth}px 1fr ${panelOpen ? '348px' : '0px'}`,
        gridTemplateRows,
        height: '100vh',
        width: '100%',
        background: 'var(--bg)',
        color: 'var(--fg)',
        transition: 'grid-template-columns 250ms var(--ease)',
        overflow: 'hidden',
      }}
    >
      <Sidebar />
      <Header />
      <main
        style={{
          gridColumn: panelOpen ? '2 / 3' : '2 / -1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <div className="page-scroll">
          <Outlet />
        </div>
      </main>
      {panelOpen && <DetailPanel />}
    </div>
  )
}

export function AppLayout() {
  return (
    <ShellProvider>
      <TopbarProvider>
        <ShellGrid />
      </TopbarProvider>
    </ShellProvider>
  )
}
