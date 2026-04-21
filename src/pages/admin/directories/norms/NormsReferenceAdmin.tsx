/**
 * /admin/directories/norms — Нормативно-технологический справочник КРС
 * НТС-КРС: 5 tabs — помещения / площадки / сценарии / пастбища / коэффициенты
 * Data from farm_norms_ref via RPC (d11_norms.sql).
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useRpc } from '@/hooks/useRpc'
import { useSetTopbar } from '@/components/layout/TopbarContext'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NormRow {
  code: string
  data: Record<string, unknown>
  valid_from: string
  valid_to: string | null
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const COL_STYLE: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 12,
  color: 'var(--fg)',
  borderBottom: '1px solid var(--bd)',
  verticalAlign: 'top',
}

const HEAD_STYLE: React.CSSProperties = {
  ...COL_STYLE,
  fontWeight: 600,
  color: 'var(--fg2)',
  background: 'var(--bg-s)',
  position: 'sticky',
  top: 0,
  zIndex: 1,
}

function NormTable({
  headers,
  children,
}: {
  headers: string[]
  children: React.ReactNode
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={HEAD_STYLE}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={COL_STYLE}>
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function val(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (Array.isArray(v)) return (v as string[]).join(', ') || '—'
  return String(v)
}

function BoolBadge({ v }: { v: unknown }) {
  if (v === true || v === 'Да') return <CheckCircle2 size={14} style={{ color: 'var(--green, #22c55e)' }} />
  if (v === false || v === 'Нет') return <span style={{ color: 'var(--fg3)' }}>—</span>
  return <span style={{ fontSize: 11, color: 'var(--fg3)' }}>{String(v)}</span>
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        background: 'var(--bg-s)',
        border: '1px solid var(--bd)',
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 12,
        color: 'var(--fg3)',
      }}
    >
      <AlertCircle size={14} />
      {children}
    </div>
  )
}

// ─── Main container ───────────────────────────────────────────────────────────

const NORMS_TABS = [
  { label: 'Помещения',    path: '/admin/directories/norms/facilities' },
  { label: 'Площадки',    path: '/admin/directories/norms/paddocks' },
  { label: 'Сценарии',    path: '/admin/directories/norms/scenarios' },
  { label: 'Пастбища',    path: '/admin/directories/norms/pasture' },
  { label: 'Коэффициенты', path: '/admin/directories/norms/coefficients' },
]

export function NormsReferenceAdmin() {
  const { pathname } = useLocation()
  const { isAdmin, checking } = useAdminGuard()

  useSetTopbar({
    title: 'Нормативы',
    titleIcon: <ClipboardList size={15} />,
    tabs: NORMS_TABS,
  })

  if (checking) return <div className="page"><Skeleton className="h-48 w-full" /></div>
  if (!isAdmin) return null

  if (pathname === '/admin/directories/norms' || pathname === '/admin/directories/norms/') {
    return <Navigate to="/admin/directories/norms/facilities" replace />
  }

  return (
    <div key={pathname} className="tab-content">
      <Outlet />
    </div>
  )
}

// ─── Tab 1: Помещения и сооружения (FAC-*) ───────────────────────────────────

export function FacilityNormsTab() {
  const { data, isLoading } = useRpc<NormRow[]>('rpc_list_facility_norms', {})

  const headers = ['Код', 'Наименование', 'Тип', 'Категория скота', 'Ед.', 'Норма пл. (м²)', 'Мин. ширина', 'Мин. высота', 'Сцен.-зав.', 'Материалы']

  return (
    <div className="page" style={{ paddingTop: 16 }}>
      <SectionNote>
        Источник: НТП-1-99, практика репродукторов КРС мясного направления РК. Нормы определяют площадь при расчёте CAPEX.
      </SectionNote>
      <NormTable headers={headers}>
        {isLoading ? (
          <LoadingRows cols={headers.length} />
        ) : (
          (data || []).map((row) => {
            const d = row.data
            return (
              <tr key={row.code} style={{ transition: 'background 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-s)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
              >
                <td style={{ ...COL_STYLE, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>{row.code}</td>
                <td style={{ ...COL_STYLE, fontWeight: 500 }}>{val(d.name_ru)}</td>
                <td style={COL_STYLE}>{val(d.type)}</td>
                <td style={COL_STYLE}>{val(d.animal_category)}</td>
                <td style={{ ...COL_STYLE, color: 'var(--fg3)' }}>{val(d.unit)}</td>
                <td style={{ ...COL_STYLE, textAlign: 'center' }}>
                  {d.area_per_unit_m2 != null ? (
                    <Badge variant="outline" style={{ fontSize: 11 }}>{val(d.area_per_unit_m2)}</Badge>
                  ) : '—'}
                </td>
                <td style={{ ...COL_STYLE, textAlign: 'center', color: 'var(--fg3)' }}>{val(d.min_width_m)}</td>
                <td style={{ ...COL_STYLE, textAlign: 'center', color: 'var(--fg3)' }}>
                  {d.min_height_no_bedding_m != null
                    ? `${val(d.min_height_no_bedding_m)} / ${val(d.min_height_with_bedding_m)}`
                    : '—'}
                </td>
                <td style={{ ...COL_STYLE, textAlign: 'center' }}>
                  <BoolBadge v={d.scenario_dependent} />
                </td>
                <td style={{ ...COL_STYLE, fontSize: 11, color: 'var(--fg3)', maxWidth: 160 }}>
                  {Array.isArray(d.allowed_materials) && (d.allowed_materials as string[]).length > 0
                    ? (d.allowed_materials as string[]).join(', ')
                    : '—'}
                </td>
              </tr>
            )
          })
        )}
      </NormTable>
    </div>
  )
}

// ─── Tab 2: Площадки (PAD-*) ─────────────────────────────────────────────────

export function PaddockNormsTab() {
  const { data, isLoading } = useRpc<NormRow[]>('rpc_list_paddock_norms', {})

  const headers = ['Код', 'Категория скота', 'Тип покрытия', 'Норма (м²/гол.)', 'Min', 'Max', 'Источник', 'User override']

  return (
    <div className="page" style={{ paddingTop: 16 }}>
      <SectionNote>
        Нормы площадок выгула и кормления. Источники: НТП-1-99 и практика казахстанских репродукторов.
      </SectionNote>
      <NormTable headers={headers}>
        {isLoading ? (
          <LoadingRows cols={headers.length} />
        ) : (
          (data || []).map((row) => {
            const d = row.data
            return (
              <tr key={row.code}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-s)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
              >
                <td style={{ ...COL_STYLE, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>{row.code}</td>
                <td style={{ ...COL_STYLE, fontWeight: 500 }}>{val(d.animal_category)}</td>
                <td style={COL_STYLE}>
                  <Badge variant="outline" style={{ fontSize: 11 }}>{val(d.surface_type)}</Badge>
                </td>
                <td style={{ ...COL_STYLE, textAlign: 'center' }}>
                  <Badge variant="outline" style={{ fontSize: 11, fontWeight: 700 }}>{val(d.norm_m2_per_head)}</Badge>
                </td>
                <td style={{ ...COL_STYLE, textAlign: 'center', color: 'var(--fg3)' }}>{val(d.min_m2)}</td>
                <td style={{ ...COL_STYLE, textAlign: 'center', color: 'var(--fg3)' }}>{val(d.max_m2)}</td>
                <td style={{ ...COL_STYLE, fontSize: 11, color: 'var(--fg3)' }}>{val(d.source)}</td>
                <td style={{ ...COL_STYLE, textAlign: 'center' }}>
                  <BoolBadge v={d.user_override} />
                </td>
              </tr>
            )
          })
        )}
      </NormTable>
    </div>
  )
}

// ─── Tab 3: Сценарии отёла (SCN-*) ───────────────────────────────────────────

export function CalvingScenariosTab() {
  const { data, isLoading } = useRpc<NormRow[]>('rpc_list_calving_scenarios', {})

  return (
    <div className="page" style={{ paddingTop: 16 }}>
      <SectionNote>
        Два базовых сценария отёла. Переключатель сценария меняет доли закрытых/полуоткрытых/открытых помещений и влияет на расчёт CAPEX и OPEX.
      </SectionNote>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(data || []).map((row) => {
            const d = row.data
            return (
              <div
                key={row.code}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--bd)',
                  borderRadius: 10,
                  padding: '20px 24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <code style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'var(--bg-m)', padding: '2px 8px', borderRadius: 4 }}>
                    {row.code}
                  </code>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{val(d.name_ru)}</span>
                  <Badge variant="outline" style={{ fontSize: 11, marginLeft: 'auto' }}>{val(d.period)}</Badge>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Закрытые помещения', value: d.share_enclosed_pct },
                    { label: 'Полуоткрытые', value: d.share_semi_open_pct },
                    { label: 'Открытые', value: d.share_open_pct },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--bg-s)', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>{val(value)}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <FactRow label="Требование к помещениям" value={val(d.enclosed_demand)} />
                  <FactRow label="Подстилка" value={val(d.bedding_notes)} />
                  <FactRow label="Влияние на CAPEX" value={val(d.capex_impact)} />
                  <FactRow label="Влияние на OPEX" value={val(d.opex_impact)} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--fg)' }}>{value}</div>
    </div>
  )
}

// ─── Tab 4: Пастбища — региональные нормы (REG-*) ────────────────────────────

export function RegionalPastureTab() {
  const { data, isLoading } = useRpc<NormRow[]>('rpc_list_regional_pasture_norms', {})

  const headers = ['Код', 'Область', 'Природная зона', 'Норма (га/усл.гол.)', 'Пастб. период', 'Местный план']

  return (
    <div className="page" style={{ paddingTop: 16 }}>
      <SectionNote>
        Базовые нормы пастбищной нагрузки по 17 областям РК. При User override — норма корректируется под конкретный участок.
      </SectionNote>
      <NormTable headers={headers}>
        {isLoading ? (
          <LoadingRows cols={headers.length} />
        ) : (
          (data || []).map((row) => {
            const d = row.data
            return (
              <tr key={row.code}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-s)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
              >
                <td style={{ ...COL_STYLE, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>{row.code}</td>
                <td style={{ ...COL_STYLE, fontWeight: 500 }}>{val(d.region_name)}</td>
                <td style={{ ...COL_STYLE, color: 'var(--fg3)', fontSize: 11 }}>{val(d.natural_zone)}</td>
                <td style={{ ...COL_STYLE, textAlign: 'center' }}>
                  <Badge variant="outline" style={{ fontSize: 12, fontWeight: 700 }}>{val(d.base_ha_per_head)}</Badge>
                </td>
                <td style={{ ...COL_STYLE, textAlign: 'center', color: 'var(--fg3)' }}>{val(d.grazing_months)} мес.</td>
                <td style={{ ...COL_STYLE, textAlign: 'center' }}>
                  <BoolBadge v={d.needs_local_plan} />
                </td>
              </tr>
            )
          })
        )}
      </NormTable>
    </div>
  )
}

// ─── Tab 5: Коэффициенты CAPEX (COEF-*) ──────────────────────────────────────

export function CapexCoefficientsTab() {
  const { data, isLoading } = useRpc<NormRow[]>('rpc_list_capex_coefficients', {})

  const headers = ['Код', 'Наименование', 'Default', 'Min', 'Max', 'Ед.', 'Когда применяется']

  return (
    <div className="page" style={{ paddingTop: 16 }}>
      <SectionNote>
        Коэффициенты для расчёта CAPEX. CAPEX объекта = Площадь × Стоим./м² × COEF-001 × COEF-002 × COEF-003 × COEF-004 × COEF-006.
      </SectionNote>
      <NormTable headers={headers}>
        {isLoading ? (
          <LoadingRows cols={headers.length} />
        ) : (
          (data || []).map((row) => {
            const d = row.data
            const def = Number(d.default_value)
            const min = Number(d.min_value)
            const max = Number(d.max_value)
            const isPercent = val(d.unit).includes('доля')

            return (
              <tr key={row.code}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-s)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
              >
                <td style={{ ...COL_STYLE, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>{row.code}</td>
                <td style={COL_STYLE}>
                  <div style={{ fontWeight: 500 }}>{val(d.name_ru)}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 2 }}>{val(d.description)}</div>
                </td>
                <td style={{ ...COL_STYLE, textAlign: 'center' }}>
                  <Badge style={{ fontSize: 12, fontWeight: 700 }}>
                    {isPercent ? `${(def * 100).toFixed(0)}%` : def}
                  </Badge>
                </td>
                <td style={{ ...COL_STYLE, textAlign: 'center', color: 'var(--fg3)' }}>
                  {isPercent ? `${(min * 100).toFixed(0)}%` : min}
                </td>
                <td style={{ ...COL_STYLE, textAlign: 'center', color: 'var(--fg3)' }}>
                  {isPercent ? `${(max * 100).toFixed(0)}%` : max}
                </td>
                <td style={{ ...COL_STYLE, fontSize: 11, color: 'var(--fg3)' }}>{val(d.unit)}</td>
                <td style={{ ...COL_STYLE, fontSize: 11, color: 'var(--fg3)' }}>{val(d.applies_when)}</td>
              </tr>
            )
          })
        )}
      </NormTable>
    </div>
  )
}
