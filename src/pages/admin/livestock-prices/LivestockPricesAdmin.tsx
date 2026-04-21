/**
 * ADR-PRICES-01 Phase 4: Livestock sale prices admin page.
 * /admin/livestock-prices — справочник цен продажи КРС.
 *
 * Используется engine.revenue как Priority 2 (после project override).
 * MVP: категория + год. region + age_months зарезервированы для следующих ADR.
 */
import { useState } from 'react'
import { Banknote, Pencil, Plus, Archive } from 'lucide-react'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useRpc, useRpcMutation } from '@/hooks/useRpc'
import { useDirectoryTopbar } from '@/pages/admin/directories/DirectoryShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface LivestockPrice {
  code: string
  livestock_category: 'steer_own' | 'heifer_breeding' | 'cow_culled' | 'bull_culled'
  year: number
  region_id: string | null
  age_months: number | null
  price_per_kg: number
  currency: string
  source: string | null
  valid_from: string
  valid_to: string | null
}

const CATEGORY_OPTIONS = [
  { value: 'steer_own',       label: 'Бычки (собственные)' },
  { value: 'heifer_breeding', label: 'Тёлки племенные' },
  { value: 'cow_culled',      label: 'Коровы выбракованные' },
  { value: 'bull_culled',     label: 'Быки выбракованные' },
] as const

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map(o => [o.value, o.label]),
)

function makeCode(category: string, year: number, ageMonths: number | null): string {
  const age = ageMonths == null ? '' : `:${ageMonths}mo`
  return `${category}:${year}${age}`
}

export function LivestockPricesAdmin() {
  const { isAdmin, checking } = useAdminGuard()
  const [editItem, setEditItem] = useState<LivestockPrice | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: rows, isLoading, refetch } = useRpc<LivestockPrice[]>('rpc_list_livestock_prices', {})

  useDirectoryTopbar({ directoryId: 'livestock-prices', title: 'Цены КРС', Icon: Banknote })

  if (checking) return <div className="page"><Skeleton className="h-48 w-full" /></div>
  if (!isAdmin) return null

  const COL = 'minmax(200px,2fr) 80px 130px 130px 1fr 44px'

  return (
    <div className="page space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <p className="text-[12px]" style={{ color: 'var(--fg3)' }}>
          Priority 2 fallback для engine (после project override). Defaults применяются при пересчёте существующих проектов, где соответствующее поле в ProjectInput = null.
        </p>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="ml-auto h-7 px-3 text-[12px] font-medium"
        >
          <Plus className="mr-1.5 h-3 w-3" /> Новая цена
        </Button>
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div className="flex flex-col border border-border/60 rounded-[8px] overflow-hidden bg-background">
          {/* Header */}
          <div className="grid border-b border-border/60 bg-muted/40" style={{ gridTemplateColumns: COL }}>
            {[
              { label: 'Категория' },
              { label: 'Год', right: true },
              { label: 'Цена (₸/кг)', right: true },
              { label: 'Период' },
              { label: 'Источник' },
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
          {(rows || []).length === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-[13px]" style={{ color: 'var(--fg3)' }}>
              Нет цен в справочнике. Добавьте первую через «+ Новая цена».
            </div>
          ) : (rows || []).map(r => (
            <div
              key={r.code}
              onClick={() => setEditItem(r)}
              className="grid border-b border-border/60 cursor-pointer hover:bg-muted/40 transition-colors group last:border-b-0"
              style={{ gridTemplateColumns: COL }}
            >
              <div className="h-[38px] px-3 flex items-center border-r border-border/60 min-w-0">
                <span className="text-[13px] font-medium truncate">
                  {CATEGORY_LABEL[r.livestock_category] || r.livestock_category}
                </span>
                {r.age_months != null && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">
                    {r.age_months} мес
                  </span>
                )}
              </div>
              <div className="h-[38px] px-3 flex items-center justify-end border-r border-border/60 font-mono text-[12px]">
                {r.year}
              </div>
              <div className="h-[38px] px-3 flex items-center justify-end border-r border-border/60 font-mono text-[13px] font-medium">
                {r.price_per_kg.toLocaleString('ru-RU')}
              </div>
              <div className="h-[38px] px-3 flex items-center border-r border-border/60 font-mono text-[11px]" style={{ color: 'var(--fg3)' }}>
                {r.valid_from}{r.valid_to ? ` → ${r.valid_to}` : ''}
              </div>
              <div className="h-[38px] px-3 flex items-center border-r border-border/60 text-[12px] truncate" style={{ color: 'var(--fg2)' }}>
                {r.source || '—'}
              </div>
              <div className="h-[38px] px-3 flex items-center justify-center text-muted-foreground group-hover:text-foreground">
                <Pencil className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      {(showCreate || editItem) && (
        <PriceDialog
          item={editItem}
          onClose={() => { setShowCreate(false); setEditItem(null) }}
          onSaved={() => { refetch(); setShowCreate(false); setEditItem(null) }}
        />
      )}
    </div>
  )
}

// ─── Dialog (create + edit + retire) ────────────────────────────────────────

function PriceDialog({
  item,
  onClose,
  onSaved,
}: {
  item: LivestockPrice | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!item
  const [category, setCategory] = useState<string>(item?.livestock_category || 'steer_own')
  const [year, setYear] = useState<number>(item?.year || new Date().getFullYear())
  const [pricePerKg, setPricePerKg] = useState<string>(item ? String(item.price_per_kg) : '')
  const [ageMonths, setAgeMonths] = useState<string>(item?.age_months != null ? String(item.age_months) : '')
  const [source, setSource] = useState<string>(item?.source || '')

  const upsert = useRpcMutation('rpc_upsert_livestock_price', {
    successMessage: 'Цена сохранена',
    onSuccess: () => onSaved(),
  })
  const retire = useRpcMutation('rpc_retire_livestock_price', {
    successMessage: 'Цена архивирована',
    onSuccess: () => onSaved(),
  })

  const handleSave = () => {
    const price = Number(pricePerKg)
    if (!price || price <= 0) {
      toast.error('Цена должна быть больше 0')
      return
    }
    const age = ageMonths === '' ? null : Number(ageMonths)
    const code = isEdit ? item!.code : makeCode(category, year, age)
    upsert.mutate({
      p_code:               code,
      p_livestock_category: category,
      p_year:               year,
      p_price_per_kg:       price,
      p_region_id:          null,        // MVP
      p_age_months:         age,
      p_source:             source || null,
    })
  }

  const handleRetire = () => {
    if (!item) return
    if (!confirm('Архивировать цену? valid_to будет установлен во вчерашний день.')) return
    retire.mutate({ p_code: item.code })
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Изменить цену' : 'Новая цена'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label className="text-sm">Категория</Label>
            <Select value={category} onValueChange={setCategory} disabled={isEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit && <p className="text-[10px] text-muted-foreground mt-1">Категория зашита в код записи. Для смены — создайте новую.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Год</Label>
              <Input
                type="number"
                value={year}
                onChange={e => setYear(Number(e.target.value) || new Date().getFullYear())}
                disabled={isEdit}
                min={2020} max={2100}
              />
            </div>
            <div>
              <Label className="text-sm">Возраст (мес) — опционально</Label>
              <Input
                type="number"
                value={ageMonths}
                onChange={e => setAgeMonths(e.target.value)}
                placeholder="пусто = базовая"
                min={0} max={60}
                disabled={isEdit}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm">Цена (₸/кг ЖВ)</Label>
            <Input
              type="number"
              value={pricePerKg}
              onChange={e => setPricePerKg(e.target.value)}
              placeholder="1800"
              min={500} max={5000}
              step="50"
            />
          </div>

          <div>
            <Label className="text-sm">Источник (опционально)</Label>
            <Input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Напр. MSH 2026 Q1, Astana Meat Market"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isEdit && (
            <Button variant="outline" onClick={handleRetire} className="mr-auto gap-1.5">
              <Archive className="h-3.5 w-3.5" /> Архивировать
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
