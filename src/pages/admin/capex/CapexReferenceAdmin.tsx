/**
 * ADR-CAPEX-01 Phase 4: CAPEX Reference Admin
 * /admin/capex — справочник для data-driven CAPEX engine (Dok 7 §11)
 *
 * Tabs:
 *   1. Материалы — 4 типа (light_frame / sandwich / steel / brick) + цена м²
 *   2. Нормативы инфраструктуры — 53 позиции grouped by block
 *   3. Надбавки — works_rate / contingency_rate + per-block contingency base
 */
import { useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Building2, Pencil, Plus } from 'lucide-react'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useRpc, useRpcMutation } from '@/hooks/useRpc'
import { useSetTopbar } from '@/components/layout/TopbarContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Material {
  code: string
  name_ru: string
  cost_per_m2: number
  currency?: string
  valid_from?: string
  valid_to?: string | null
}

interface InfraNormRow {
  code: string
  data: {
    name_ru?: string
    block?: string
    display_order?: number
    cost_model?: string
    applies_to?: string
    material_target?: string | null
    depreciation_years?: number
    area_per_head_m2?: number
    fixed_area_m2?: number
    unit_cost?: number
    fixed_qty?: number
    fixed_cost?: number
    area_divisor_ha?: number
    unit_cost_per_m2_override?: number | null
    calving_scenario_multiplier?: { Зимний?: number; Летний?: number }
  }
  valid_from?: string
  valid_to?: string | null
}

type InfraNormsByBlock = Record<string, InfraNormRow[]>

interface SurchargesData {
  works_rate: number
  contingency_rate: number
  applies_to_blocks: string[]
  contingency_base_by_block: Record<string, 'items_only' | 'items_plus_work'>
}

interface SurchargesRow {
  id?: number
  code: string
  data: SurchargesData
  valid_from?: string
}

const BLOCK_LABELS: Record<string, string> = {
  farm: 'Ферма',
  pasture: 'Пастбища',
  equipment: 'Техника',
  tools: 'Инструменты',
}

const COST_MODEL_OPTIONS = [
  { value: 'area_per_head',      label: 'area_per_head — норма м²/гол × capacity × цена_м²' },
  { value: 'fixed_area',         label: 'fixed_area — фикс. площадь × цена_м²' },
  { value: 'per_head_unit',      label: 'per_head_unit — capacity × unit_cost' },
  { value: 'fixed_qty',          label: 'fixed_qty — qty × unit_cost' },
  { value: 'fixed_per_project',  label: 'fixed_per_project — разовая сумма' },
  { value: 'per_area_ha',        label: 'per_area_ha — ceil(га / divisor) × unit_cost' },
]

const APPLIES_TO_OPTIONS = [
  { value: 'capacity',        label: 'capacity (reproducer_capacity)' },
  { value: 'always',          label: 'always (1 раз)' },
  { value: 'pasture_area_ha', label: 'pasture_area_ha (capacity × norm_ha)' },
  { value: 'cows_eop',        label: 'cows_eop (eop коров, month 0)' },
  { value: 'bulls_eop',       label: 'bulls_eop (eop быков, month 0)' },
  { value: 'calves_avg',      label: 'calves_avg (среднее калфов, year 1)' },
  { value: 'heifers_avg',     label: 'heifers_avg (среднее тёлок, year 1)' },
  { value: 'steers_avg',      label: 'steers_avg (среднее бычков, year 1)' },
]

const MATERIAL_TARGET_OPTIONS = [
  { value: 'NONE',     label: '— (не площадное)' },
  { value: 'enclosed', label: 'enclosed (закрытое — берёт construction_material_enclosed)' },
  { value: 'support',  label: 'support (вспомогательное — берёт construction_material_support)' },
]

// ─── Main Component ─────────────────────────────────────────────────────────

const CAPEX_TABS = [
  { label: 'Материалы',                path: '/admin/capex/materials' },
  { label: 'Нормативы инфраструктуры', path: '/admin/capex/norms' },
  { label: 'Надбавки',                 path: '/admin/capex/surcharges' },
]

export function CapexReferenceAdmin() {
  const { pathname } = useLocation()
  const { isAdmin, checking } = useAdminGuard()

  useSetTopbar({
    title: 'Инфраструктура',
    titleIcon: <Building2 size={15} />,
    tabs: CAPEX_TABS,
  })

  if (checking) return <div className="page"><Skeleton className="h-48 w-full" /></div>
  if (!isAdmin) return null

  // Redirect bare /admin/capex → /admin/capex/materials
  if (pathname === '/admin/capex' || pathname === '/admin/capex/') {
    return <Navigate to="/admin/capex/materials" replace />
  }

  return (
    <div key={pathname} className="tab-content">
      <Outlet />
    </div>
  )
}

// ─── Tab 1: Materials ───────────────────────────────────────────────────────

export function CapexMaterialsTab() {
  const [editItem, setEditItem] = useState<Material | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const { data: materials, isLoading, refetch } = useRpc<Material[]>('rpc_list_construction_materials', {})

  const COL = 'minmax(200px,2fr) 130px 150px 1fr 44px'

  return (
    <div className="page space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <p className="text-[12px]" style={{ color: 'var(--fg3)' }}>
          4 базовых материала. Цена м² применяется для area-based CAPEX норм (Dok 7 §11.5).
        </p>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="ml-auto h-7 px-3 text-[12px] font-medium"
        >
          <Plus className="mr-1.5 h-3 w-3" /> Новый материал
        </Button>
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div className="flex flex-col border border-border/60 rounded-[8px] overflow-hidden bg-background">
          {/* Header row */}
          <div className="grid border-b border-border/60 bg-muted/40" style={{ gridTemplateColumns: COL }}>
            {[
              { label: 'Название' },
              { label: 'Код' },
              { label: 'Цена 1 м² (₸)', right: true },
              { label: 'Валюта' },
              { label: '' },
            ].map((h, i) => (
              <div key={i}
                className={`h-[34px] px-3 flex items-center text-[11px] font-medium border-r border-border/60 last:border-r-0 ${h.right ? 'justify-end' : ''}`}
                style={{ color: 'var(--fg2)' }}>
                {h.label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {(materials || []).length === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-[13px]" style={{ color: 'var(--fg3)' }}>
              Нет материалов. Добавьте первый через «+ Новый материал».
            </div>
          ) : (materials || []).map(m => (
            <div
              key={m.code}
              onClick={() => setEditItem(m)}
              className="grid border-b border-border/60 cursor-pointer hover:bg-muted/40 transition-colors group last:border-b-0"
              style={{ gridTemplateColumns: COL }}
            >
              <div className="h-[38px] px-3 flex items-center border-r border-border/60 min-w-0">
                <span className="text-[13px] font-medium truncate">{m.name_ru}</span>
              </div>
              <div className="h-[38px] px-3 flex items-center border-r border-border/60 font-mono text-[11px]" style={{ color: 'var(--fg3)' }}>
                {m.code}
              </div>
              <div className="h-[38px] px-3 flex items-center justify-end border-r border-border/60 text-[13px] font-mono tabular-nums">
                {m.cost_per_m2.toLocaleString('ru-RU')}
              </div>
              <div className="h-[38px] px-3 flex items-center border-r border-border/60 text-[12px]" style={{ color: 'var(--fg2)' }}>
                <Badge variant="outline" className="text-[11px] font-normal">{m.currency || 'KZT'}</Badge>
              </div>
              <div className="h-[38px] flex items-center justify-center">
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--fg3)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <MaterialDialog
        key={editItem?.code || 'new'}
        open={showCreate || editItem !== null}
        item={editItem}
        onClose={() => { setShowCreate(false); setEditItem(null) }}
        onSaved={() => { setShowCreate(false); setEditItem(null); refetch() }}
      />
    </div>
  )
}

function MaterialDialog({ open, item, onClose, onSaved }: {
  open: boolean
  item: Material | null
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(item?.code || '')
  const [nameRu, setNameRu] = useState(item?.name_ru || '')
  const [costPerM2, setCostPerM2] = useState(String(item?.cost_per_m2 ?? ''))
  const isEdit = !!item

  const upsert = useRpcMutation<Record<string, unknown>, number>(
    'rpc_upsert_construction_material',
    {
      successMessage: isEdit ? 'Материал обновлён' : 'Материал добавлен',
      onSuccess: () => onSaved(),
    }
  )

  const handleSave = () => {
    const cost = Number(costPerM2)
    if (!code || !nameRu || Number.isNaN(cost) || cost < 0) {
      toast.error('Заполните код, название и положительную цену')
      return
    }
    upsert.mutate({
      p_code: code,
      p_name_ru: nameRu,
      p_cost_per_m2: cost,
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать материал' : 'Новый материал'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Код</Label>
            <Input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="sandwich"
              disabled={isEdit}
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label>Название (RU)</Label>
            <Input value={nameRu} onChange={e => setNameRu(e.target.value)} placeholder="Сэндвич-панель" />
          </div>
          <div className="space-y-1">
            <Label>Цена 1 м² (₸)</Label>
            <Input
              type="number"
              step="100"
              value={costPerM2}
              onChange={e => setCostPerM2(e.target.value)}
              placeholder="25000"
            />
            <p className="text-xs text-muted-foreground">
              Применяется при `material_target = enclosed` или `support` в CAPEX норме.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tab 2: Infrastructure Norms ────────────────────────────────────────────

export function CapexNormsTab() {
  const [editItem, setEditItem] = useState<InfraNormRow | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [blockFilter, setBlockFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const { data: normsByBlock, isLoading, refetch } = useRpc<InfraNormsByBlock>('rpc_list_infrastructure_norms', {})

  const allNorms = useMemo(() => {
    const groups = normsByBlock || {}
    const blocks: string[] = blockFilter === 'all' ? Object.keys(groups) : [blockFilter]
    const rows: InfraNormRow[] = []
    for (const b of blocks) {
      for (const n of (groups[b] || [])) rows.push(n)
    }
    // Apply search on code + name
    if (search) {
      const q = search.toLowerCase()
      return rows.filter(n =>
        (n.code || '').toLowerCase().includes(q) ||
        (n.data?.name_ru || '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [normsByBlock, blockFilter, search])

  const COL = '100px minmax(260px,2fr) 110px 150px 130px 70px 44px'

  return (
    <div className="page space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Поиск по коду или названию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs h-8 text-[13px]"
        />
        <Select value={blockFilter} onValueChange={setBlockFilter}>
          <SelectTrigger className="h-8 w-44 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все блоки</SelectItem>
            <SelectItem value="farm">Ферма</SelectItem>
            <SelectItem value="pasture">Пастбища</SelectItem>
            <SelectItem value="equipment">Техника</SelectItem>
            <SelectItem value="tools">Инструменты</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[12px]" style={{ color: 'var(--fg3)' }}>
          Всего: {allNorms.length}
        </p>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="ml-auto h-7 px-3 text-[12px] font-medium"
        >
          <Plus className="mr-1.5 h-3 w-3" /> Новый норматив
        </Button>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="flex flex-col border border-border/60 rounded-[8px] overflow-hidden bg-background">
          {/* Header row */}
          <div className="grid border-b border-border/60 bg-muted/40" style={{ gridTemplateColumns: COL }}>
            {[
              { label: 'Код' },
              { label: 'Название' },
              { label: 'Блок' },
              { label: 'Модель' },
              { label: 'Applies to' },
              { label: 'Депр., лет', right: true },
              { label: '' },
            ].map((h, i) => (
              <div key={i}
                className={`h-[34px] px-3 flex items-center text-[11px] font-medium border-r border-border/60 last:border-r-0 ${h.right ? 'justify-end' : ''}`}
                style={{ color: 'var(--fg2)' }}>
                {h.label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {allNorms.length === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-[13px]" style={{ color: 'var(--fg3)' }}>
              {search || blockFilter !== 'all' ? 'Ничего не найдено' : 'Нет нормативов в справочнике'}
            </div>
          ) : allNorms.map(n => (
            <div
              key={n.code}
              onClick={() => setEditItem(n)}
              className="grid border-b border-border/60 cursor-pointer hover:bg-muted/40 transition-colors group last:border-b-0"
              style={{ gridTemplateColumns: COL }}
            >
              <div className="h-[36px] px-3 flex items-center border-r border-border/60 font-mono text-[11px]" style={{ color: 'var(--fg3)' }}>
                {n.code}
              </div>
              <div className="h-[36px] px-3 flex items-center border-r border-border/60 min-w-0">
                <span className="text-[13px] truncate">{n.data?.name_ru || '—'}</span>
              </div>
              <div className="h-[36px] px-3 flex items-center border-r border-border/60">
                <Badge variant="outline" className="text-[11px] font-normal">
                  {BLOCK_LABELS[n.data?.block || ''] || n.data?.block}
                </Badge>
              </div>
              <div className="h-[36px] px-3 flex items-center border-r border-border/60 text-[11px] font-mono" style={{ color: 'var(--fg2)' }}>
                {n.data?.cost_model || '—'}
              </div>
              <div className="h-[36px] px-3 flex items-center border-r border-border/60 text-[11px] font-mono" style={{ color: 'var(--fg3)' }}>
                {n.data?.applies_to || '—'}
              </div>
              <div className="h-[36px] px-3 flex items-center justify-end border-r border-border/60 text-[12px] tabular-nums">
                {n.data?.depreciation_years ?? '—'}
              </div>
              <div className="h-[36px] flex items-center justify-center">
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--fg3)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <NormDialog
        key={editItem?.code || 'new'}
        open={showCreate || editItem !== null}
        item={editItem}
        onClose={() => { setShowCreate(false); setEditItem(null) }}
        onSaved={() => { setShowCreate(false); setEditItem(null); refetch() }}
      />
    </div>
  )
}

function NormDialog({ open, item, onClose, onSaved }: {
  open: boolean
  item: InfraNormRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!item
  const d = item?.data || {}

  const [code, setCode] = useState(item?.code || '')
  const [nameRu, setNameRu] = useState(d.name_ru || '')
  const [block, setBlock] = useState(d.block || 'farm')
  const [displayOrder, setDisplayOrder] = useState(String(d.display_order ?? ''))
  const [deprYears, setDeprYears] = useState(String(d.depreciation_years ?? '20'))
  const [costModel, setCostModel] = useState(d.cost_model || 'fixed_per_project')
  const [appliesTo, setAppliesTo] = useState(d.applies_to || 'always')
  const [materialTarget, setMaterialTarget] = useState<string>(d.material_target || 'NONE')

  // Model params
  const [areaPerHead, setAreaPerHead] = useState(String(d.area_per_head_m2 ?? ''))
  const [fixedArea, setFixedArea] = useState(String(d.fixed_area_m2 ?? ''))
  const [unitCost, setUnitCost] = useState(String(d.unit_cost ?? ''))
  const [fixedQty, setFixedQty] = useState(String(d.fixed_qty ?? ''))
  const [fixedCost, setFixedCost] = useState(String(d.fixed_cost ?? ''))
  const [areaDivisor, setAreaDivisor] = useState(String(d.area_divisor_ha ?? ''))

  // Optional
  const [priceOverride, setPriceOverride] = useState(
    d.unit_cost_per_m2_override != null ? String(d.unit_cost_per_m2_override) : ''
  )
  const [multWinter, setMultWinter] = useState(String(d.calving_scenario_multiplier?.Зимний ?? ''))
  const [multSummer, setMultSummer] = useState(String(d.calving_scenario_multiplier?.Летний ?? ''))

  const upsert = useRpcMutation<Record<string, unknown>, number>(
    'rpc_upsert_infrastructure_norm',
    {
      successMessage: isEdit ? 'Норматив обновлён' : 'Норматив добавлен',
      onSuccess: () => onSaved(),
    }
  )

  const isArea = costModel === 'area_per_head' || costModel === 'fixed_area'

  const handleSave = () => {
    if (!code || !nameRu) {
      toast.error('Заполните код и название')
      return
    }

    const data: Record<string, unknown> = {
      name_ru: nameRu,
      block,
      display_order: Number(displayOrder) || 0,
      depreciation_years: Number(deprYears) || 0,
      cost_model: costModel,
      applies_to: appliesTo,
      material_target: materialTarget === 'NONE' ? null : materialTarget,
    }

    // Model-specific params
    switch (costModel) {
      case 'area_per_head':
        data.area_per_head_m2 = Number(areaPerHead) || 0
        break
      case 'fixed_area':
        data.fixed_area_m2 = Number(fixedArea) || 0
        break
      case 'per_head_unit':
        data.unit_cost = Number(unitCost) || 0
        break
      case 'fixed_qty':
        data.fixed_qty = Number(fixedQty) || 0
        data.unit_cost = Number(unitCost) || 0
        break
      case 'fixed_per_project':
        data.fixed_cost = Number(fixedCost) || 0
        break
      case 'per_area_ha':
        data.area_divisor_ha = Number(areaDivisor) || 0
        data.unit_cost = Number(unitCost) || 0
        break
    }

    // Optional bespoke price (only relevant for area models)
    if (isArea && priceOverride.trim() !== '') {
      data.unit_cost_per_m2_override = Number(priceOverride) || 0
    }

    // Optional calving multiplier (only populate if provided)
    const w = multWinter.trim() !== '' ? Number(multWinter) : null
    const s = multSummer.trim() !== '' ? Number(multSummer) : null
    if (w !== null || s !== null) {
      const mult: Record<string, number> = {}
      if (w !== null) mult['Зимний'] = w
      if (s !== null) mult['Летний'] = s
      data.calving_scenario_multiplier = mult
    }

    upsert.mutate({
      p_code: code,
      p_data: data,
      p_block: block,
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Редактировать норматив ${code}` : 'Новый норматив инфраструктуры'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Код</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="FAC-001"
                disabled={isEdit}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label>Блок</Label>
              <Select value={block} onValueChange={setBlock}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="farm">Ферма</SelectItem>
                  <SelectItem value="pasture">Пастбища</SelectItem>
                  <SelectItem value="equipment">Техника</SelectItem>
                  <SelectItem value="tools">Инструменты</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Название (RU)</Label>
            <Input value={nameRu} onChange={e => setNameRu(e.target.value)} placeholder="Общий ангар 8 м²/гол" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Порядок отображения</Label>
              <Input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} placeholder="15" />
            </div>
            <div className="space-y-1">
              <Label>Амортизация, лет</Label>
              <Input type="number" value={deprYears} onChange={e => setDeprYears(e.target.value)} placeholder="20" />
            </div>
          </div>

          {/* Cost model */}
          <div className="pt-2 space-y-1">
            <Label>Cost model</Label>
            <Select value={costModel} onValueChange={setCostModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COST_MODEL_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>applies_to</Label>
              <Select value={appliesTo} onValueChange={setAppliesTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPLIES_TO_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Material target</Label>
              <Select value={materialTarget} onValueChange={setMaterialTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_TARGET_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Model-specific parameters */}
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Параметры модели</p>

            {costModel === 'area_per_head' && (
              <div className="space-y-1">
                <Label>area_per_head_m2 (м²/гол)</Label>
                <Input type="number" step="0.0001" value={areaPerHead} onChange={e => setAreaPerHead(e.target.value)} />
              </div>
            )}

            {costModel === 'fixed_area' && (
              <div className="space-y-1">
                <Label>fixed_area_m2 (м²)</Label>
                <Input type="number" value={fixedArea} onChange={e => setFixedArea(e.target.value)} />
              </div>
            )}

            {costModel === 'per_head_unit' && (
              <div className="space-y-1">
                <Label>unit_cost (₸/гол)</Label>
                <Input type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
              </div>
            )}

            {costModel === 'fixed_qty' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>fixed_qty</Label>
                  <Input type="number" value={fixedQty} onChange={e => setFixedQty(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>unit_cost (₸/шт)</Label>
                  <Input type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
                </div>
              </div>
            )}

            {costModel === 'fixed_per_project' && (
              <div className="space-y-1">
                <Label>fixed_cost (₸)</Label>
                <Input type="number" value={fixedCost} onChange={e => setFixedCost(e.target.value)} />
              </div>
            )}

            {costModel === 'per_area_ha' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>area_divisor_ha (1 на N га)</Label>
                  <Input type="number" value={areaDivisor} onChange={e => setAreaDivisor(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>unit_cost (₸/шт)</Label>
                  <Input type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Bespoke price (area models only) */}
          {isArea && (
            <div className="space-y-1">
              <Label>Bespoke цена м² (override)</Label>
              <Input
                type="number"
                value={priceOverride}
                onChange={e => setPriceOverride(e.target.value)}
                placeholder="(пусто = использовать material_target цену)"
              />
              <p className="text-xs text-muted-foreground">
                Перекрывает цену из material_target. Использовать для Excel-парности (10 позиций в seed).
              </p>
            </div>
          )}

          {/* Calving multiplier */}
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Сезонный мультипликатор (опционально)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Зимний (×)</Label>
                <Input type="number" step="0.1" value={multWinter} onChange={e => setMultWinter(e.target.value)} placeholder="1.0" />
              </div>
              <div className="space-y-1">
                <Label>Летний (×)</Label>
                <Input type="number" step="0.1" value={multSummer} onChange={e => setMultSummer(e.target.value)} placeholder="0.5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Оставьте пустым если позиция не зависит от сценария отёла. Пример: FAC-012 крытое отёла = Летний 0.5.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tab 3: Surcharges ──────────────────────────────────────────────────────

export function CapexSurchargesTab() {
  const [current, setCurrent] = useState<SurchargesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ADR-CAPEX-01 tech debt: no dedicated rpc_list_capex_surcharges yet.
  // Direct table read is admin-only (RLS: crd_read_all) — documented exception
  // to the «always via supabase.rpc()» rule. Flagged for future DB Agent work.
  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('consulting_reference_data')
      .select('id, code, data, valid_from')
      .eq('category', 'capex_surcharges')
      .order('valid_from', { ascending: false })
      .limit(1)
    setLoading(false)
    if (error) {
      toast.error(`Ошибка загрузки: ${error.message}`)
      return
    }
    const first = (data as SurchargesRow[])[0]
    if (first) setCurrent(first.data)
  }

  useMemo(() => { load() }, [])

  const [worksRate, setWorksRate] = useState('0.06')
  const [contingencyRate, setContingencyRate] = useState('0.025')
  const [applyFarm, setApplyFarm] = useState(true)
  const [applyPasture, setApplyPasture] = useState(true)
  const [applyEquipment, setApplyEquipment] = useState(false)
  const [applyTools, setApplyTools] = useState(false)
  const [baseFarm, setBaseFarm] = useState<'items_only' | 'items_plus_work'>('items_plus_work')
  const [basePasture, setBasePasture] = useState<'items_only' | 'items_plus_work'>('items_only')

  // Hydrate form from loaded data
  useMemo(() => {
    if (!current) return
    setWorksRate(String(current.works_rate ?? 0.06))
    setContingencyRate(String(current.contingency_rate ?? 0.025))
    const blocks = current.applies_to_blocks || []
    setApplyFarm(blocks.includes('farm'))
    setApplyPasture(blocks.includes('pasture'))
    setApplyEquipment(blocks.includes('equipment'))
    setApplyTools(blocks.includes('tools'))
    const base = current.contingency_base_by_block || {}
    setBaseFarm((base.farm as 'items_only' | 'items_plus_work') ?? 'items_plus_work')
    setBasePasture((base.pasture as 'items_only' | 'items_plus_work') ?? 'items_only')
  }, [current])

  const handleSave = async () => {
    const applies: string[] = []
    if (applyFarm) applies.push('farm')
    if (applyPasture) applies.push('pasture')
    if (applyEquipment) applies.push('equipment')
    if (applyTools) applies.push('tools')

    const payload: SurchargesData = {
      works_rate: Number(worksRate) || 0,
      contingency_rate: Number(contingencyRate) || 0,
      applies_to_blocks: applies,
      contingency_base_by_block: {
        farm: baseFarm,
        pasture: basePasture,
      },
    }

    setSaving(true)
    const { error } = await supabase.rpc('rpc_upsert_consulting_reference', {
      p_category: 'capex_surcharges',
      p_code: 'default',
      p_data: payload,
      p_valid_from: null,
    })
    setSaving(false)

    if (error) {
      toast.error(`Ошибка: ${error.message}`)
      return
    }
    toast.success('Надбавки сохранены')
    setCurrent(payload)
  }

  if (loading) return <div className="page"><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="page space-y-4">
      <div className="max-w-2xl space-y-4">
        <p className="text-[12px]" style={{ color: 'var(--fg3)' }}>
          Надбавки применяются на subtotal per block. Для farm база = items+works (Excel row 28),
          для pasture = items only (Excel row 37). Editing здесь обновляет строку
          <span className="font-mono mx-1">consulting_reference_data[category=capex_surcharges, code=default]</span>.
        </p>

        <div className="border border-border/60 rounded-[8px] bg-background p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Работы (rate)</Label>
              <Input type="number" step="0.001" value={worksRate} onChange={e => setWorksRate(e.target.value)} />
              <p className="text-xs text-muted-foreground">0.06 = 6% надбавки за работы</p>
            </div>
            <div className="space-y-1">
              <Label>Непредвиденные (rate)</Label>
              <Input type="number" step="0.001" value={contingencyRate} onChange={e => setContingencyRate(e.target.value)} />
              <p className="text-xs text-muted-foreground">0.025 = 2.5% (Excel фактический, не 3%)</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label className="text-sm">Блоки, к которым применяются надбавки</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'farm',      state: applyFarm,      set: setApplyFarm },
                { key: 'pasture',   state: applyPasture,   set: setApplyPasture },
                { key: 'equipment', state: applyEquipment, set: setApplyEquipment },
                { key: 'tools',     state: applyTools,     set: setApplyTools },
              ].map(b => (
                <label key={b.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={b.state} onCheckedChange={(v) => b.set(v === true)} />
                  <span className="text-sm">{BLOCK_LABELS[b.key]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label className="text-sm">Contingency base (per block)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ферма</Label>
                <Select value={baseFarm} onValueChange={(v: 'items_only' | 'items_plus_work') => setBaseFarm(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="items_plus_work">items + works (Excel farm)</SelectItem>
                    <SelectItem value="items_only">items only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Пастбища</Label>
                <Select value={basePasture} onValueChange={(v: 'items_only' | 'items_plus_work') => setBasePasture(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="items_only">items only (Excel pasture)</SelectItem>
                    <SelectItem value="items_plus_work">items + works</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Excel row 28: farm contingency = 2.5% × (items + works). Row 37: pasture = 2.5% × items only.
            </p>
          </div>

          <div className="pt-3 border-t border-border/40 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить надбавки'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
