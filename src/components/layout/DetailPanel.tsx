import { X } from 'lucide-react'
import { useShell } from './ShellContext'

/**
 * Detail Panel shell — 348px slide-in from right.
 * Content will be added per-screen as Dok 6 contracts are implemented.
 */
export function DetailPanel() {
  const { closePanel, panelRecord } = useShell()

  return (
    <aside
      style={{
        gridRow: '1 / -1',
        borderLeft: '1px solid var(--bd)',
        background: 'var(--bg-s)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'shellPanelSlideIn 250ms var(--ease)',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--bd)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>Details</span>
        <button
          onClick={closePanel}
          title="Close (Cmd+])"
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
          <X size={15} />
        </button>
      </div>

      {/* Panel body — empty shell for now */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {panelRecord ? (
          <div style={{ fontSize: 12, color: 'var(--fg3)' }}>
            Record loaded. Content will be rendered per-screen.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--fg3)' }}>No record selected.</div>
        )}
      </div>
    </aside>
  )
}
