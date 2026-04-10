/**
 * ProjectWizard — 5-step parameter input for investment project
 * Route: /admin/consulting/:projectId/edit
 * Calls: consulting engine POST /api/v1/calculate
 */
import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calculator, Check, Beef, Landmark, ToggleLeft, MapPin, Hash, Percent, DollarSign, Users, TrendingUp, TrendingDown, RefreshCcw, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { calculateProject } from '@/lib/consulting-api'
import { cacheResults } from './tabs/usProjectData'
import { toast } from 'sonner'

interface WizardParams {
  initial_cows: number
  reproducer_capacity: number
  purchase_price_cow: number
  purchase_price_bull: number
  pasture_norm_ha: number
  calving_scenario: string
  // Коэффициенты стада (в %)
  calf_yield_pct: number            // Приплод (85%)
  cow_mortality_pct: number         // Падёж коров (3%)
  cow_culling_pct: number           // Выбраковка коров (15%)
  bull_mortality_pct: number        // Падёж быков (3%)
  bull_culling_pct: number          // Выбраковка быков (25%)
  heifer_mortality_pct: number      // Падёж молодняка (3%)
  // Технология
  breeding_duration_months: number  // Период случной кампании (мес)
  gestation_months: number          // Стельность (мес)
  suckling_months: number           // Подсосный период (мес)
  steer_sale_age_months: number     // Возраст реализации бычков (0=декабрь, 7/12/18)
  // Привесы и вес (Task A)
  birth_weight_kg: number
  daily_gain_steer_pasture: number
  daily_gain_steer_stall: number
  daily_gain_heifer_pasture: number
  daily_gain_heifer_stall: number
  cow_culled_weight_kg: number
  bull_culled_weight_kg: number
  // Финансирование
  equity_share_pct: number
  capex_loan_term_years: number
  capex_grace_period_years: number
  livestock_loan_rate_pct: number
  wc_loan_rate_pct: number
  subsidy_switch: number
  wc_loan_switch: number
  bioasset_revaluation_switch: number
  project_start_date: string
}

/** Task B: Client-side sale weight estimator */
function estimateSaleWeight(
  birthWeight: number,
  gainPasture: number,
  gainStall: number,
  months: number,
): number {
  const avgDailyGain = (gainPasture * 183 + gainStall * 182) / 365
  return Math.round(birthWeight + avgDailyGain * months * 30.44)
}

const STEPS = [
  { title: 'Тип фермы', desc: 'Поголовье и мощность', icon: Beef },
  { title: 'Коэффициенты', desc: 'Приплод, падёж, выбраковка', icon: Beef },
  { title: 'Технология', desc: 'Отёл, случка, доращивание', icon: MapPin },
  { title: 'Финансирование', desc: 'Условия кредитования', icon: Landmark },
  { title: 'Переключатели', desc: 'Субсидии и оборотка', icon: ToggleLeft },
  { title: 'Подтверждение', desc: 'Проверка и запуск расчёта', icon: Check },
]

const DEFAULT_PARAMS: WizardParams = {
  initial_cows: 200,
  reproducer_capacity: 300,
  purchase_price_cow: 550_000,
  purchase_price_bull: 650_000,
  pasture_norm_ha: 10,
  calving_scenario: 'Зимний',
  calf_yield_pct: 85,
  cow_mortality_pct: 3,
  cow_culling_pct: 15,
  bull_mortality_pct: 3,
  bull_culling_pct: 25,
  heifer_mortality_pct: 3,
  breeding_duration_months: 2,
  gestation_months: 9,
  suckling_months: 7,
  steer_sale_age_months: 0,
  birth_weight_kg: 30,
  daily_gain_steer_pasture: 0.850,
  daily_gain_steer_stall: 0.650,
  daily_gain_heifer_pasture: 0.810,
  daily_gain_heifer_stall: 0.600,
  cow_culled_weight_kg: 600,
  bull_culled_weight_kg: 750,
  equity_share_pct: 15,
  capex_loan_term_years: 10,
  capex_grace_period_years: 2,
  livestock_loan_rate_pct: 5,
  wc_loan_rate_pct: 6,
  subsidy_switch: 1,
  wc_loan_switch: 1,
  bioasset_revaluation_switch: 1,
  project_start_date: '2026-08-31',
}

const STEER_SALE_OPTIONS = [
  { value: 0, label: 'В декабре (текущее)' },
  { value: 7, label: 'Ранняя (7 мес.)' },
  { value: 12, label: 'Лёгкое доращивание (12 мес.)' },
  { value: 18, label: 'Глубокое доращивание (18 мес.)' },
]

/** Field component defined OUTSIDE to prevent re-mount on every render */
function WizardField({ label, value, onChange, type = 'number', suffix, hint, step }: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
  suffix?: string
  hint?: string
  step?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="font-mono"
          step={step}
        />
        {suffix && <span className="text-sm text-muted-foreground whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function ProjectWizard() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const { organization } = useAuth()
  const [mode, setMode] = useState<'view' | 'edit'>('edit')
  const [step, setStep] = useState(0)
  const [params, setParams] = useState<WizardParams>(DEFAULT_PARAMS)
  const [calculating, setCalculating] = useState(false)
  const [savedParamsStr, setSavedParamsStr] = useState('')
  const [results, setResults] = useState<any>({})
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 1024)


  const orgId = organization?.id

  // Resize listener for responsive fallback
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Load saved params + results from last version
  useEffect(() => {
    if (!orgId || !projectId) return

    // Load results from sessionStorage cache for Highlights
    try {
      const raw = sessionStorage.getItem('consulting_results')
      if (raw) {
        const cached = JSON.parse(raw)
        if (cached.projectId === projectId && Date.now() - cached.ts < 600_000) {
          setResults(cached.results || {})
        }
      }
    } catch { /* ignore */ }

    supabase.rpc('rpc_get_consulting_project', {
      p_organization_id: orgId,
      p_project_id: projectId,
    }).then(({ data: proj }) => {
      if (proj?.versions?.length > 0) {
        setMode('view')
        const saved = proj.versions[0].input_params
        if (saved) {
          const merged: WizardParams = {
            ...DEFAULT_PARAMS,
            initial_cows: saved.initial_cows ?? DEFAULT_PARAMS.initial_cows,
            reproducer_capacity: saved.reproducer_capacity ?? DEFAULT_PARAMS.reproducer_capacity,
            purchase_price_cow: saved.purchase_price_cow ?? DEFAULT_PARAMS.purchase_price_cow,
            purchase_price_bull: saved.purchase_price_bull ?? DEFAULT_PARAMS.purchase_price_bull,
            pasture_norm_ha: saved.pasture_norm_ha ?? DEFAULT_PARAMS.pasture_norm_ha,
            calving_scenario: saved.calving_scenario ?? DEFAULT_PARAMS.calving_scenario,
            equity_share_pct: saved.equity_share ? saved.equity_share * 100 : DEFAULT_PARAMS.equity_share_pct,
            capex_loan_term_years: saved.capex_loan_term_years ?? DEFAULT_PARAMS.capex_loan_term_years,
            capex_grace_period_years: saved.capex_grace_period_years ?? DEFAULT_PARAMS.capex_grace_period_years,
            livestock_loan_rate_pct: saved.livestock_loan_rate ? saved.livestock_loan_rate * 100 : DEFAULT_PARAMS.livestock_loan_rate_pct,
            wc_loan_rate_pct: saved.wc_loan_rate ? saved.wc_loan_rate * 100 : DEFAULT_PARAMS.wc_loan_rate_pct,
            subsidy_switch: saved.subsidy_switch ?? DEFAULT_PARAMS.subsidy_switch,
            wc_loan_switch: saved.wc_loan_switch ?? DEFAULT_PARAMS.wc_loan_switch,
            bioasset_revaluation_switch: saved.bioasset_revaluation_switch ?? DEFAULT_PARAMS.bioasset_revaluation_switch,
            project_start_date: saved.project_start_date ?? DEFAULT_PARAMS.project_start_date,
            steer_sale_age_months: saved.steer_sale_age_months ?? DEFAULT_PARAMS.steer_sale_age_months,
            birth_weight_kg: saved.birth_weight_kg ?? DEFAULT_PARAMS.birth_weight_kg,
            daily_gain_steer_pasture: saved.daily_gain_steer_pasture ?? DEFAULT_PARAMS.daily_gain_steer_pasture,
            daily_gain_steer_stall: saved.daily_gain_steer_stall ?? DEFAULT_PARAMS.daily_gain_steer_stall,
            daily_gain_heifer_pasture: saved.daily_gain_heifer_pasture ?? DEFAULT_PARAMS.daily_gain_heifer_pasture,
            daily_gain_heifer_stall: saved.daily_gain_heifer_stall ?? DEFAULT_PARAMS.daily_gain_heifer_stall,
            cow_culled_weight_kg: saved.cow_culled_weight_kg ?? DEFAULT_PARAMS.cow_culled_weight_kg,
            bull_culled_weight_kg: saved.bull_culled_weight_kg ?? DEFAULT_PARAMS.bull_culled_weight_kg,
          }
          setParams(merged)
          setSavedParamsStr(JSON.stringify(merged))
        }
      }
    })
  }, [orgId, projectId])

  const set = useCallback((key: keyof WizardParams, raw: string) => {
    setParams(p => ({
      ...p,
      [key]: typeof p[key] === 'number' ? (Number(raw) || 0) : raw,
    }))
  }, [])

  const handleCalculate = async () => {
    if (!orgId || !projectId) return
    setCalculating(true)
    try {
      const result = await calculateProject({
        project_id: projectId,
        organization_id: orgId,
        input_params: {
          ...params,
          // Convert % fields back to decimals
          equity_share: params.equity_share_pct / 100,
          livestock_loan_rate: params.livestock_loan_rate_pct / 100,
          wc_loan_rate: params.wc_loan_rate_pct / 100,
          calf_yield: params.calf_yield_pct / 100,
          cow_mortality_rate: params.cow_mortality_pct / 100,
          cow_culling_rate: params.cow_culling_pct / 100,
          bull_mortality_rate: params.bull_mortality_pct / 100,
          bull_culling_rate: params.bull_culling_pct / 100,
          heifer_mortality_rate: params.heifer_mortality_pct / 100,
          breeding_duration_months: params.breeding_duration_months,
          gestation_months: params.gestation_months,
          suckling_months: params.suckling_months,
          steer_sale_age_months: params.steer_sale_age_months,
          birth_weight_kg: params.birth_weight_kg,
          daily_gain_steer_pasture: params.daily_gain_steer_pasture,
          daily_gain_steer_stall: params.daily_gain_steer_stall,
          daily_gain_heifer_pasture: params.daily_gain_heifer_pasture,
          daily_gain_heifer_stall: params.daily_gain_heifer_stall,
          cow_culled_weight_kg: params.cow_culled_weight_kg,
          bull_culled_weight_kg: params.bull_culled_weight_kg,
          farm_type: 'beef_reproducer',
          bull_ratio: 1 / 15,
        },
      })
      // Cache results for instant tab access
      cacheResults(projectId, result.results, params)
      setResults(result.results || {})
      setSavedParamsStr(JSON.stringify(params))
      setMode('view')
      toast.success(`Расчёт завершён. Версия ${result.version_number}`)
      navigate(`/admin/consulting/${projectId}/summary`)
    } catch (err: any) {
      toast.error(err.message || 'Ошибка расчёта')
    } finally {
      setCalculating(false)
    }
  }

  const bulls = Math.ceil(params.initial_cows * (1 / 15))
  const pasture = params.pasture_norm_ha * params.reproducer_capacity
  const livestockCost = (params.initial_cows * params.purchase_price_cow + bulls * params.purchase_price_bull) / 1000

  // ================================================================
  // VIEW MODE — full parameter form + results sidebar
  // ================================================================
  if (mode === 'view') {
    const isDirty = savedParamsStr !== '' && JSON.stringify(params) !== savedParamsStr

    const wacc = results.wacc || {}
    const hasResults = wacc.irr != null || wacc.npv != null
    const needsCalc = !hasResults || isDirty

    const irrStr   = wacc.irr  != null ? `${(wacc.irr  * 100).toFixed(1)}%` : '—'
    const npvStr   = wacc.npv  != null ? `${Math.round(wacc.npv).toLocaleString('ru-RU')} тыс.` : '—'
    const pbkStr   = wacc.payback_years ? `${wacc.payback_years} лет` : '—'
    const revArr: number[] | undefined = results.revenue?.total_revenue
    const revY5Str = revArr
      ? `${Math.round(revArr.slice(48, 60).reduce((a: number, b: number) => a + (b ?? 0), 0) / 1000).toLocaleString('ru-RU')} млн`
      : '—'

    type PR = {
      id: keyof WizardParams
      label: string
      Icon: React.ComponentType<any>
      suffix?: string
      type?: string
      step?: string
      bar?: { max: number; color: string }
      options?: { label: string; value: string | number }[]
    }

    // Section label — sits above each card
    const SL = ({ children }: { children: string }) => (
      <p style={{ fontSize: 10, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginTop: 20, marginBottom: 6 }}>
        {children}
      </p>
    )

    // Standard param row inside a card
    const Row = (row: PR) => {
      const { Icon } = row
      const val = params[row.id]
      return (
        <div key={row.id} className="param-row" style={{ display: 'flex', alignItems: 'center', minHeight: 40, gap: 10, padding: '0 16px', borderBottom: '1px solid var(--bd)' }}>
          <Icon size={13} style={{ color: 'var(--fg3)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--fg2)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            {row.options ? (
              <select className="param-select" value={String(val)} onChange={e => set(row.id, e.target.value)}>
                {row.options.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
              </select>
            ) : (
              <input className="param-input" type={row.type || 'number'} step={row.step} value={String(val)} onChange={e => set(row.id, e.target.value)} />
            )}
            {row.suffix && !row.options && (
              <span style={{ fontSize: 10, color: 'var(--fg3)', minWidth: 36 }}>{row.suffix}</span>
            )}
          </div>
        </div>
      )
    }

    // Coefficient row — label + full-width bar + compact input
    const CoeffRow = (row: PR) => {
      const { Icon } = row
      const val = params[row.id]
      const pct = row.bar ? Math.min((Number(val) / row.bar.max) * 100, 100) : 0
      return (
        <div key={row.id} className="param-row" style={{ display: 'flex', alignItems: 'center', minHeight: 42, gap: 10, padding: '0 16px', borderBottom: '1px solid var(--bd)' }}>
          <Icon size={13} style={{ color: 'var(--fg3)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--fg2)', minWidth: 128, flexShrink: 0 }}>{row.label}</span>
          {row.bar && (
            <div style={{ flex: 1, height: 5, borderRadius: 9999, background: 'var(--bg-m)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: row.bar.color, borderRadius: 9999, transition: 'width 400ms ease' }} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <input className="param-input" type="number" step={row.step} value={String(val)} onChange={e => set(row.id, e.target.value)} style={{ width: 52 }} />
            <span style={{ fontSize: 10, color: 'var(--fg3)', minWidth: 14 }}>%</span>
          </div>
        </div>
      )
    }

    const farmRows: PR[] = [
      { id: 'initial_cows',        label: 'Маточное поголовье',    Icon: Users,       suffix: 'голов' },
      { id: 'reproducer_capacity', label: 'Мощность репродуктора', Icon: Hash,        suffix: 'голов' },
      { id: 'purchase_price_cow',  label: 'Цена коровы',           Icon: DollarSign,  suffix: 'тг' },
      { id: 'purchase_price_bull', label: 'Цена быка',             Icon: DollarSign,  suffix: 'тг' },
      { id: 'pasture_norm_ha',     label: 'Норма пастбищ',         Icon: MapPin,      suffix: 'га/гол' },
      { id: 'calving_scenario',    label: 'Сценарий отёла',        Icon: Clock,       options: [{ label: 'Летний', value: 'Летний' }, { label: 'Зимний', value: 'Зимний' }] },
      { id: 'project_start_date',  label: 'Дата старта',           Icon: Clock,       type: 'date' },
    ]

    const coeffRows: PR[] = [
      { id: 'calf_yield_pct',       label: 'Приплод',          Icon: Percent,      suffix: '%', bar: { max: 100, color: 'var(--green)' } },
      { id: 'cow_mortality_pct',    label: 'Падёж коров',      Icon: TrendingDown, suffix: '%', bar: { max: 20,  color: 'var(--red)'   } },
      { id: 'bull_mortality_pct',   label: 'Падёж быков',      Icon: TrendingDown, suffix: '%', bar: { max: 20,  color: 'var(--red)'   } },
      { id: 'heifer_mortality_pct', label: 'Падёж молодняка',  Icon: TrendingDown, suffix: '%', bar: { max: 20,  color: 'var(--red)'   } },
      { id: 'cow_culling_pct',      label: 'Выбраковка коров', Icon: RefreshCcw,   suffix: '%', bar: { max: 40,  color: 'var(--blue)'  } },
      { id: 'bull_culling_pct',     label: 'Выбраковка быков', Icon: RefreshCcw,   suffix: '%', bar: { max: 40,  color: 'var(--blue)'  } },
    ]

    const techRows: PR[] = [
      { id: 'steer_sale_age_months',    label: 'Реализация бычков',   Icon: Clock,       options: STEER_SALE_OPTIONS.map(o => ({ label: o.label, value: o.value })) },
      { id: 'birth_weight_kg',          label: 'Вес при рождении',    Icon: Hash,        suffix: 'кг' },
      { id: 'daily_gain_steer_pasture', label: 'Привес бычки (лето)', Icon: TrendingUp,  suffix: 'кг/д', step: '0.01' },
      { id: 'daily_gain_steer_stall',   label: 'Привес бычки (зима)', Icon: TrendingUp,  suffix: 'кг/д', step: '0.01' },
      { id: 'daily_gain_heifer_pasture',label: 'Привес тёлки (лето)', Icon: TrendingUp,  suffix: 'кг/д', step: '0.01' },
      { id: 'daily_gain_heifer_stall',  label: 'Привес тёлки (зима)', Icon: TrendingUp,  suffix: 'кг/д', step: '0.01' },
      { id: 'cow_culled_weight_kg',     label: 'Вес коровы (убой)',   Icon: Hash,        suffix: 'кг' },
      { id: 'bull_culled_weight_kg',    label: 'Вес быка (убой)',     Icon: Hash,        suffix: 'кг' },
    ]

    const finRows: PR[] = [
      { id: 'equity_share_pct',         label: 'Собств. участие',   Icon: Percent,    suffix: '%' },
      { id: 'capex_loan_term_years',    label: 'Срок кредита',      Icon: Clock,      suffix: 'лет' },
      { id: 'capex_grace_period_years', label: 'Льготный период',   Icon: Clock,      suffix: 'лет' },
      { id: 'livestock_loan_rate_pct',  label: 'Ставка скот',       Icon: Percent,    suffix: '%' },
      { id: 'wc_loan_rate_pct',         label: 'Ставка оборотная',  Icon: Percent,    suffix: '%' },
      { id: 'subsidy_switch',           label: 'Субсидии',          Icon: ToggleLeft, options: [{ label: 'Да', value: 1 }, { label: 'Нет', value: 2 }] },
      { id: 'wc_loan_switch',           label: 'Займы на ПОС',      Icon: ToggleLeft, options: [{ label: 'Да', value: 1 }, { label: 'Нет', value: 2 }] },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* ── Top strip: live computed values ── */}
        <div style={{ display: 'flex', alignItems: 'center', height: 38, borderBottom: '1px solid var(--bd)', background: 'var(--bg-m)', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { label: 'Стоимость стада', value: `${Math.round(livestockCost).toLocaleString('ru-RU')} тыс. тг` },
            { label: 'Быков',           value: `${bulls}` },
            { label: 'Пастбища',        value: `${pasture.toLocaleString('ru-RU')} га` },
            { label: 'Вес бычка',       value: `~${estimateSaleWeight(params.birth_weight_kg, params.daily_gain_steer_pasture, params.daily_gain_steer_stall, params.steer_sale_age_months || 12)} кг` },
          ].map(chip => (
            <div key={chip.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 18px', borderRight: '1px solid var(--bd)', height: '100%', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: 'var(--fg3)' }}>{chip.label}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{chip.value}</span>
            </div>
          ))}
          <button onClick={() => setMode('edit')} style={{ marginLeft: 'auto', padding: '0 18px', height: '100%', background: 'none', border: 'none', fontSize: 11, color: 'var(--fg3)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Полный мастер →
          </button>
        </div>

        {/* ── Main: form (left) + results panel (right) ── */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 280px', overflow: 'hidden' }}>

          {/* ── LEFT: all editable parameters ── */}
          <div style={{ overflowY: 'auto', padding: '4px 24px 32px' }}>

            <SL>Тип фермы</SL>
            <div className="param-card" style={{ background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 8, overflow: 'hidden' }}>
              {farmRows.map(Row)}
            </div>

            <SL>Коэффициенты</SL>
            <div className="param-card" style={{ background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 8, overflow: 'hidden' }}>
              {coeffRows.map(CoeffRow)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <SL>Технология</SL>
                <div className="param-card" style={{ background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 8, overflow: 'hidden' }}>
                  {techRows.map(Row)}
                </div>
              </div>
              <div>
                <SL>Финансирование</SL>
                <div className="param-card" style={{ background: 'var(--bg-c)', border: '1px solid var(--bd)', borderRadius: 8, overflow: 'hidden' }}>
                  {finRows.map(Row)}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: results panel ── */}
          <div style={{ borderLeft: '1px solid var(--bd)', background: 'var(--bg-s)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {!hasResults ? (
              // Empty state — first-time CTA
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 16, textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg-m)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calculator size={22} style={{ color: 'var(--fg3)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg2)', marginBottom: 6 }}>Результаты не рассчитаны</p>
                  <p style={{ fontSize: 11, color: 'var(--fg3)', lineHeight: 1.6 }}>Задайте параметры и нажмите «Рассчитать»</p>
                </div>
              </div>
            ) : (
              // Results — with hero IRR
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
                <p style={{ fontSize: 10, color: 'var(--fg3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 16 }}>
                  Результаты
                </p>

                {isDirty && (
                  <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 16, padding: '8px 12px', background: 'var(--bg-m)', borderRadius: 6, lineHeight: 1.5, border: '1px solid var(--bd)' }}>
                    Параметры изменены — нужен пересчёт
                  </div>
                )}

                {/* Hero metric: IRR */}
                <div style={{ padding: '14px 0 12px', borderBottom: '1px solid var(--bd)', marginBottom: 2, opacity: isDirty ? 0.35 : 1, transition: 'opacity 200ms' }}>
                  <p style={{ fontSize: 10, color: 'var(--fg3)', marginBottom: 6, letterSpacing: '0.04em' }}>IRR</p>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: (wacc.irr ?? 0) > 0.05 ? 'var(--green)' : 'var(--fg)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {irrStr}
                  </p>
                </div>

                {/* Secondary metrics */}
                {[
                  { label: 'NPV',        value: npvStr   },
                  { label: 'Payback',    value: pbkStr   },
                  { label: 'Выручка Y5', value: revY5Str },
                ].map(kpi => (
                  <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid var(--bd)', opacity: isDirty ? 0.35 : 1, transition: 'opacity 200ms' }}>
                    <span style={{ fontSize: 11, color: 'var(--fg3)' }}>{kpi.label}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{kpi.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sticky recalculate button */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bd)', background: 'var(--bg-s)', flexShrink: 0 }}>
              <button
                onClick={handleCalculate}
                disabled={calculating || !needsCalc}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 7,
                  border: needsCalc ? 'none' : '1px solid var(--bd)',
                  background: needsCalc ? 'var(--brand)' : 'var(--bg-m)',
                  color: needsCalc ? '#fff' : 'var(--fg3)',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                  cursor: (calculating || !needsCalc) ? 'default' : 'pointer',
                  transition: 'background 150ms, color 150ms',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: calculating ? 0.65 : 1,
                }}
              >
                <Calculator size={14} />
                {calculating ? 'Расчёт...' : 'Рассчитать'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ================================================================
  // EDIT MODE — wizard with steps
  // ================================================================
  return (
    <div className="page space-y-6">
      <div className="mx-auto max-w-2xl space-y-6">

      {/* Step indicator */}
      <div className="flex gap-1">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`flex h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-[var(--color-cta)]' : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Step content — fixed height card with internal scroll */}
      <Card className="flex flex-col" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        <CardHeader className="shrink-0">
          <CardTitle className="flex items-center gap-2">
            {(() => { const Icon = STEPS[step]?.icon; return Icon ? <Icon className="h-5 w-5 text-muted-foreground" /> : null })()}
            {STEPS[step]?.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{STEPS[step]?.desc}</p>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 overflow-y-auto">

          {/* Step 1: Farm type */}
          {step === 0 && (
            <>
              <WizardField label="Закуп маточного поголовья" value={params.initial_cows} onChange={v => set('initial_cows', v)} suffix="голов" />
              <WizardField label="Мощность репродуктора" value={params.reproducer_capacity} onChange={v => set('reproducer_capacity', v)} suffix="голов" />
              <WizardField label="Цена 1 маточной головы" value={params.purchase_price_cow} onChange={v => set('purchase_price_cow', v)} suffix="тг" />
              <WizardField label="Цена 1 быка-производителя" value={params.purchase_price_bull} onChange={v => set('purchase_price_bull', v)} suffix="тг" />
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm text-muted-foreground">
                Автоматически: {bulls} быков (1 на 15 коров) · Стоимость стада: {livestockCost.toLocaleString('ru-RU')} тыс. тг
              </div>
            </>
          )}

          {/* Step 2: Коэффициенты стада */}
          {step === 1 && (
            <>
              <WizardField label="Коэффициент приплода" value={params.calf_yield_pct} onChange={v => set('calf_yield_pct', v)} suffix="%" />
              <div className="h-px bg-border/50 my-2" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Падёж (годовой)</p>
              <WizardField label="Падёж коров" value={params.cow_mortality_pct} onChange={v => set('cow_mortality_pct', v)} suffix="%" />
              <WizardField label="Падёж быков" value={params.bull_mortality_pct} onChange={v => set('bull_mortality_pct', v)} suffix="%" />
              <WizardField label="Падёж молодняка (тёлки/бычки)" value={params.heifer_mortality_pct} onChange={v => set('heifer_mortality_pct', v)} suffix="%" />
              <div className="h-px bg-border/50 my-2" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Выбраковка (годовая)</p>
              <WizardField label="Выбраковка коров" value={params.cow_culling_pct} onChange={v => set('cow_culling_pct', v)} suffix="%" />
              <WizardField label="Выбраковка быков" value={params.bull_culling_pct} onChange={v => set('bull_culling_pct', v)} suffix="%" />
            </>
          )}

          {/* Step 3: Технология */}
          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm">Сценарий отёла</Label>
                <div className="flex gap-3">
                  {['Летний', 'Зимний'].map(s => (
                    <Button
                      key={s}
                      variant={params.calving_scenario === s ? 'default' : 'outline'}
                      onClick={() => set('calving_scenario', s)}
                      className="flex-1"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              <WizardField label="Дата старта проекта" value={params.project_start_date} onChange={v => set('project_start_date', v)} type="date" />
              <WizardField label="Норма пастбищ на 1 голову" value={params.pasture_norm_ha} onChange={v => set('pasture_norm_ha', v)} suffix="га" />

              <div className="h-px bg-border/50 my-2" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Производственный цикл</p>
              <WizardField label="Случная кампания" value={params.breeding_duration_months} onChange={v => set('breeding_duration_months', v)} suffix="мес" />
              <WizardField label="Стельность" value={params.gestation_months} onChange={v => set('gestation_months', v)} suffix="мес" />
              <WizardField label="Подсосный период" value={params.suckling_months} onChange={v => set('suckling_months', v)} suffix="мес" />

              <div className="h-px bg-border/50 my-2" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Реализация бычков</p>
              <div className="space-y-1.5">
                <Label className="text-sm">Стратегия реализации бычков</Label>
                <div className="grid grid-cols-2 gap-2">
                  {STEER_SALE_OPTIONS.map(opt => (
                    <Button
                      key={opt.value}
                      variant={params.steer_sale_age_months === opt.value ? 'default' : 'outline'}
                      onClick={() => set('steer_sale_age_months', String(opt.value))}
                      size="sm"
                      className="text-xs"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border/50 my-2" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Привесы и вес</p>
              <WizardField label="Вес телёнка при рождении" value={params.birth_weight_kg} onChange={v => set('birth_weight_kg', v)} suffix="кг" hint="Мясные породы КЗ: 28-40 кг" />
              <WizardField label="Привес бычков (пастбище, лето)" value={params.daily_gain_steer_pasture} onChange={v => set('daily_gain_steer_pasture', v)} suffix="кг/день" hint="Рекомендуемо: 0.70-1.10" step="0.01" />
              <WizardField label="Привес бычков (стойло, зима)" value={params.daily_gain_steer_stall} onChange={v => set('daily_gain_steer_stall', v)} suffix="кг/день" hint="Рекомендуемо: 0.50-0.85" step="0.01" />
              <WizardField label="Привес тёлок (пастбище, лето)" value={params.daily_gain_heifer_pasture} onChange={v => set('daily_gain_heifer_pasture', v)} suffix="кг/день" hint="Рекомендуемо: 0.60-1.00" step="0.01" />
              <WizardField label="Привес тёлок (стойло, зима)" value={params.daily_gain_heifer_stall} onChange={v => set('daily_gain_heifer_stall', v)} suffix="кг/день" hint="Рекомендуемо: 0.45-0.75" step="0.01" />

              {/* Task B: client-side sale weight estimator */}
              <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Расчётный вес при реализации</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Бычки ({params.steer_sale_age_months || 12} мес.)</span>
                  <span className="font-mono font-semibold">
                    ~{estimateSaleWeight(params.birth_weight_kg, params.daily_gain_steer_pasture, params.daily_gain_steer_stall, params.steer_sale_age_months || 12)} кг
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Тёлки (18 мес.)</span>
                  <span className="font-mono font-semibold">
                    ~{estimateSaleWeight(params.birth_weight_kg, params.daily_gain_heifer_pasture, params.daily_gain_heifer_stall, 18)} кг
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/70">Предварительная оценка. Точный расчёт — по кнопке Рассчитать.</p>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm text-muted-foreground">
                Пастбища: {pasture.toLocaleString('ru-RU')} га · Первый отёл: месяц {params.calving_scenario === 'Зимний' ? 17 : 12} · Цикл: {params.breeding_duration_months + params.gestation_months + params.suckling_months + (params.steer_sale_age_months > params.suckling_months ? params.steer_sale_age_months - params.suckling_months : 0)} мес
              </div>
            </>
          )}

          {/* Step 4: Financing */}
          {step === 3 && (
            <>
              <WizardField label="Доля собственного участия" value={params.equity_share_pct} onChange={v => set('equity_share_pct', v)} suffix="%" />
              <WizardField label="Срок инвест. кредита" value={params.capex_loan_term_years} onChange={v => set('capex_loan_term_years', v)} suffix="лет" />
              <WizardField label="Льготный период" value={params.capex_grace_period_years} onChange={v => set('capex_grace_period_years', v)} suffix="лет" />
              <WizardField label="Ставка по закупу скота" value={params.livestock_loan_rate_pct} onChange={v => set('livestock_loan_rate_pct', v)} suffix="%" />
              <WizardField label="Ставка по оборотному" value={params.wc_loan_rate_pct} onChange={v => set('wc_loan_rate_pct', v)} suffix="%" />
            </>
          )}

          {/* Step 5: Toggles */}
          {step === 4 && (
            <>
              {[
                { label: 'С субсидиями', field: 'subsidy_switch' as const, desc: 'Субсидии МСХ РК при закупе и содержании' },
                { label: 'С займами на ПОС', field: 'wc_loan_switch' as const, desc: 'Привлечение оборотного капитала' },
                { label: 'Без переоценки биоактивов', field: 'bioasset_revaluation_switch' as const, desc: 'Переоценка стоимости КРС на балансе' },
              ].map(({ label, field, desc }) => (
                <div key={field} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <div className="flex gap-2">
                    {[{ v: 1, l: 'Да' }, { v: 2, l: 'Нет' }].map(({ v, l }) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={params[field] === v ? 'default' : 'outline'}
                        onClick={() => set(field, String(v))}
                      >
                        {l}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Step 6: Confirmation */}
          {step === 5 && (
            <div className="space-y-4">
              {/* Summary grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Маточное', value: `${params.initial_cows} голов` },
                  { label: 'Быки', value: `${bulls} голов` },
                  { label: 'Мощность', value: `${params.reproducer_capacity} голов` },
                  { label: 'Пастбища', value: `${pasture.toLocaleString('ru-RU')} га` },
                  { label: 'Отёл', value: params.calving_scenario },
                  { label: 'Дата старта', value: params.project_start_date },
                  { label: 'Собств. участие', value: `${params.equity_share_pct}%` },
                  { label: 'Срок кредита', value: `${params.capex_loan_term_years} лет` },
                  { label: 'Льготный период', value: `${params.capex_grace_period_years} года` },
                  { label: 'Ставка скот', value: `${params.livestock_loan_rate_pct}%` },
                  { label: 'Приплод', value: `${params.calf_yield_pct}%` },
                  { label: 'Падёж коров', value: `${params.cow_mortality_pct}%` },
                  { label: 'Выбраковка коров', value: `${params.cow_culling_pct}%` },
                  { label: 'Падёж молодняка', value: `${params.heifer_mortality_pct}%` },
                  { label: 'Выбраковка быков', value: `${params.bull_culling_pct}%` },
                  { label: 'Реализация бычков', value: STEER_SALE_OPTIONS.find(o => o.value === params.steer_sale_age_months)?.label || 'В декабре' },
                  { label: 'Вес бычка', value: `~${estimateSaleWeight(params.birth_weight_kg, params.daily_gain_steer_pasture, params.daily_gain_steer_stall, params.steer_sale_age_months || 12)} кг` },
                  { label: 'Субсидии', value: params.subsidy_switch === 1 ? 'Да' : 'Нет' },
                  { label: 'Оборотка', value: params.wc_loan_switch === 1 ? 'Да' : 'Нет' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="font-mono text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {/* Cost summary */}
              <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">Стоимость стада</p>
                <p className="mt-1 font-mono text-2xl font-bold">{livestockCost.toLocaleString('ru-RU')} тыс. тг</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {params.initial_cows} коров × {params.purchase_price_cow.toLocaleString('ru-RU')} + {bulls} быков × {params.purchase_price_bull.toLocaleString('ru-RU')}
                </p>
              </div>
            </div>
          )}

        </CardContent>

        {/* Navigation — pinned to card bottom */}
        <div className="flex shrink-0 items-center justify-between border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Назад
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} className="gap-2">
              Далее <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCalculate} disabled={calculating} className="gap-2">
              {calculating ? (
                <>Расчёт...</>
              ) : (
                <><Calculator className="h-4 w-4" /> Рассчитать</>
              )}
            </Button>
          )}
        </div>
      </Card>

      </div>
    </div>
  )
}
