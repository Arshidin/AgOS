import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { ShellProvider, useShell } from './ShellContext'
import { TopbarProvider } from './TopbarContext'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { DetailPanel } from './DetailPanel'

function ShellGrid({ children }: { children?: ReactNode }) {
  const { sidebar, panelOpen, theme } = useShell()

  const sidebarWidth =
    sidebar === 'expanded' ? 240 : sidebar === 'collapsed' ? 56 : 0

  return (
    <div
      data-shell=""
      data-theme={theme}
      style={{
        display: 'grid',
        gridTemplateColumns: `${sidebarWidth}px 1fr ${panelOpen ? '348px' : '0px'}`,
        gridTemplateRows: '44px 1fr',
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
          {children ?? <Outlet />}
        </div>
      </main>
      {panelOpen && <DetailPanel />}
    </div>
  )
}

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <ShellProvider>
      <TopbarProvider>
        <ShellGrid>{children}</ShellGrid>
      </TopbarProvider>
    </ShellProvider>
  )
}
