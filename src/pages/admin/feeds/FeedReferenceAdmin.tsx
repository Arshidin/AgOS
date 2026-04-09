/**
 * Slice 8 Part A-UI: Feed Reference Admin
 * /admin/feeds — единый справочник кормов (ADR-FEED-01)
 *
 * Tabs:
 *   1. Каталог кормов (feed_items + nutrient_composition)
 *   2. Цены (feed_prices per region + valid_from/to)
 *   3. Нормы кормления (feed_consumption_norms per farm_type + category + season)
 */
import { useState } from 'react'
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useRpc, useRpcMutation } from '@/hooks/useRpc'
import { useSetTopbar } from '@/components/layout/TopbarContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, CheckCircle, Circle } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedItem {
  id: string
  code: string
  name_ru: string
  name_en?: string
  category: string
  category_name_ru: string
  nutrient_composition: Record<string, number>
  is_validated: boolean
}

interface AnimalCategory {
  id: string
  code: string
  name_ru: string
  sort_order: number
}

interface FeedConsumptionNorm {
  id: string
  farm_type: string
  animal_category_id: string
  season: string
  items: Array<{ feed_item_id: string; kg_per_day: number }>
  valid_from: string
  valid_to?: string
  notes?: string
}

const FARM_TYPE_LABELS: Record<string, string> = {
  beef_reproducer: 'Мясной репродуктор',
  feedlot: 'Откормочник',
  sheep_goat: 'Овцы/козы',
}

const SEASON_LABELS: Record<string, string> = {
  winter: 'Зима',
  summer: 'Лето',
  transition: 'Переходный',
}

const NUTRIENTS = [
  { key: 'dm_pct', label: 'СВ %' },
  { key: 'me_mj_per_kg_dm', label: 'ОЭ МДж/кг' },
  { key: 'cp_pct_dm', label: 'СП %СВ' },
  { key: 'ndf_pct_dm', label: 'НДК %СВ' },
  { key: 'ca_g_per_kg_dm', label: 'Ca г/кг' },
  { key: 'p_g_per_kg_dm', label: 'P г/кг' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function FeedReferenceAdmin() {
  useSetTopbar({ title: 'Кормовая база' })
  const { isAdmin, checking } = useAdminGuard()
  const [activeTab, setActiveTab] = useState<'catalog' | 'prices' | 'norms'>('catalog')

  if (checking) return <div className="page"><Skeleton className="h-48 w-full" /></div>
  if (!isAdmin) return null

  return (
    <div className="page space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {(['catalog', 'prices', 'norms'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {{ catalog: 'Каталог кормов', prices: 'Цены', norms: 'Нормы кормления' }[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && <CatalogTab />}
      {activeTab === 'prices' && <PricesTab />}
      {activeTab === 'norms' && <NormsTab />}
    </div>
  )
}

// ─── Tab 1: Catalog ───────────────────────────────────────────────────────────

function CatalogTab() {
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState<FeedItem | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: items, isLoading, refetch } = useRpc<FeedItem[]>('rpc_list_feed_items', { p_active_only: false })

  const filtered = (items || []).filter(i =>
    !search || i.name_ru.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Поиск по названию или коду..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Добавить корм
        </Button>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3">Код</th>
                    <th className="p-3">Название</th>
                    <th className="p-3">Категория</th>
                    <th className="p-3 text-center">СВ%</th>
                    <th className="p-3 text-center">ОЭ</th>
                    <th className="p-3 text-center">СП%</th>
                    <th className="p-3 text-center">Валид.</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Нет данных</td></tr>
                  ) : filtered.map(item => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs text-muted-foreground">{item.code}</td>
                      <td className="p-3 font-medium">{item.name_ru}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{item.category_name_ru}</Badge>
                      </td>
                      <td className="p-3 text-center text-xs">{item.nutrient_composition?.dm_pct ?? '—'}</td>
                      <td className="p-3 text-center text-xs">{item.nutrient_composition?.me_mj_per_kg_dm ?? '—'}</td>
                      <td className="p-3 text-center text-xs">{item.nutrient_composition?.cp_pct_dm ?? '—'}</td>
                      <td className="p-3 text-center">
                        {item.is_validated
                          ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          : <Circle className="w-4 h-4 text-muted-foreground mx-auto" />}
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <FeedItemDialog
        key={editItem?.id || 'new'}
        open={showCreate || editItem !== null}
        item={editItem}
        onClose={() => { setShowCreate(false); setEditItem(null) }}
        onSaved={() => { setShowCreate(false); setEditItem(null); refetch() }}
      />
    </div>
  )
}

// ─── Feed Item Dialog ─────────────────────────────────────────────────────────

function FeedItemDialog({ open, item, onClose, onSaved }: {
  open: boolean
  item: FeedItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(item?.code || '')
  const [nameRu, setNameRu] = useState(item?.name_ru || '')
  const [categoryCode, setCategoryCode] = useState(item?.category || '')
  const [nutrients, setNutrients] = useState<Record<string, string>>(
    Object.fromEntries(NUTRIENTS.map(n => [n.key, String(item?.nutrient_composition?.[n.key] ?? '')]))
  )
  const [isValidated, setIsValidated] = useState(item?.is_validated || false)

  const { data: categories } = useRpc<{ id: string; code: string; name_ru: string }[]>(
    'rpc_list_feed_categories', {}
  )

  const upsert = useRpcMutation<Record<string, unknown>, { feed_item_id: string }>(
    'rpc_upsert_feed_item',
    {
      successMessage: item ? 'Корм обновлён' : 'Корм добавлен',
      onSuccess: () => onSaved(),
    }
  )

  const handleSave = () => {
    const nc: Record<string, number> = {}
    for (const n of NUTRIENTS) {
      const val = parseFloat(nutrients[n.key] ?? '')
      if (!isNaN(val)) nc[n.key] = val
    }
    upsert.mutate({
      p_feed_item_id: item?.id || null,
      p_feed_category_code: (categoryCode ?? null) as string | null,
      p_code: code || null,
      p_name_ru: nameRu || null,
      p_nutrient_composition: Object.keys(nc).length ? nc : null,
      p_is_validated: isValidated,
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Редактировать корм' : 'Новый корм'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Код</Label>
              <Input value={code} onChange={e => setCode(e.target.value)} placeholder="HAY_MIXED_GRASS" />
            </div>
            <div className="space-y-1">
              <Label>Категория</Label>
              <Select value={categoryCode} onValueChange={setCategoryCode}>
                <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                <SelectContent>
                  {(categories || []).map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.name_ru}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Название (RU)</Label>
            <Input value={nameRu} onChange={e => setNameRu(e.target.value)} placeholder="Сено смешанное" />
          </div>

          <p className="text-xs font-medium text-muted-foreground pt-1">Состав нутриентов</p>
          <div className="grid grid-cols-3 gap-2">
            {NUTRIENTS.map(n => (
              <div key={n.key} className="space-y-1">
                <Label className="text-xs">{n.label}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={nutrients[n.key]}
                  onChange={e => setNutrients(prev => ({ ...prev, [n.key]: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isValidated}
              onChange={e => setIsValidated(e.target.checked)}
              className="rounded"
            />
            Валидировано зоотехником (Q37)
          </label>
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

interface FeedPrice {
  feed_price_id: string
  feed_item_id: string
  feed_item_code: string
  feed_item_name: string
  price_per_kg: number
  currency: string
  valid_from: string
  valid_to?: string
  region_id?: string
  is_active: boolean
  updated_at: string
}

// ─── Tab 2: Prices ────────────────────────────────────────────────────────────

function PricesTab() {
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [price, setPrice] = useState('')
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0])

  const { data: items } = useRpc<FeedItem[]>('rpc_list_feed_items', { p_active_only: true })
  const { data: prices, refetch: refetchPrices } = useRpc<FeedPrice[]>('rpc_list_feed_prices', {})

  // Map: feed_item_id → current price
  const priceMap = new Map((prices || []).map(p => [p.feed_item_id, p]))

  const upsertPrice = useRpcMutation<Record<string, unknown>, { feed_price_id: string }>(
    'rpc_upsert_feed_price',
    {
      successMessage: 'Цена сохранена',
      invalidateKeys: [['rpc_list_feed_prices']],
      onSuccess: () => { setShowForm(false); setPrice(''); setSelectedItem('') },
    }
  )

  const handleSave = () => {
    if (!selectedItem || !price) return toast.error('Выберите корм и укажите цену')
    upsertPrice.mutate({
      p_feed_item_id: selectedItem,
      p_price_per_kg: parseFloat(price),
      p_valid_from: validFrom,
      p_region_id: null,
      p_currency: 'KZT',
    })
  }

  const openEdit = (itemId: string) => {
    const existing = priceMap.get(itemId)
    setSelectedItem(itemId)
    setPrice(existing ? String(existing.price_per_kg) : '')
    setValidFrom(existing?.valid_from || new Date().toISOString().split('T')[0])
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Цены кормов (тенге/кг). Регион = null → общегосударственная цена.</p>
        <Button size="sm" onClick={() => { setSelectedItem(''); setPrice(''); setShowForm(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Установить цену
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">Корм</th>
                  <th className="p-3">Код</th>
                  <th className="p-3 text-right">Цена (тенге/кг)</th>
                  <th className="p-3">Действует с</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {(items || []).length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Нет кормов в каталоге</td></tr>
                ) : (items || []).map(item => {
                  const p = priceMap.get(item.id)
                  return (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium">{item.name_ru}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{item.code}</td>
                      <td className="p-3 text-right font-medium">
                        {p ? `${p.price_per_kg.toLocaleString('ru-RU')} ₸` : <span className="text-muted-foreground text-xs">не задана</span>}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{p?.valid_from ?? '—'}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item.id)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={v => !v && setShowForm(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Установить цену корма</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Корм</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger><SelectValue placeholder="Выберите корм..." /></SelectTrigger>
                <SelectContent>
                  {(items || []).map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.name_ru}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Цена (тенге/кг)</Label>
                <Input type="number" min="0" step="0.5" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Действует с</Label>
                <Input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={upsertPrice.isPending}>
              {upsertPrice.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Tab 3: Consumption Norms ─────────────────────────────────────────────────

function NormsTab() {
  const [filterFarmType, setFilterFarmType] = useState('beef_reproducer')
  const [showForm, setShowForm] = useState(false)
  const [editNorm, setEditNorm] = useState<FeedConsumptionNorm | null>(null)

  const { data: norms, isLoading, refetch } = useRpc<FeedConsumptionNorm[]>(
    'rpc_list_feed_consumption_norms', { p_farm_type: filterFarmType }
  )
  const { data: categories } = useRpc<AnimalCategory[]>('rpc_list_animal_categories', {})
  const { data: feedItems } = useRpc<FeedItem[]>('rpc_list_feed_items', { p_active_only: true })

  const getCategoryName = (id: string) =>
    categories?.find(c => c.id === id)?.name_ru ?? id.slice(0, 8)

  const getFeedName = (id: string) =>
    feedItems?.find(f => f.id === id)?.name_ru ?? id.slice(0, 8)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={filterFarmType} onValueChange={setFilterFarmType}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FARM_TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setEditNorm(null); setShowForm(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Добавить норму
        </Button>
        <p className="text-xs text-muted-foreground ml-auto">
          Нормы кормления (кг/день) для Python engine (feeding_model.py Priority 2)
        </p>
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">Категория</th>
                  <th className="p-3">Сезон</th>
                  <th className="p-3">Корма (кол-во позиций)</th>
                  <th className="p-3">Действует с</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {(!norms || norms.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Нормы не заданы. Добавьте нормы кормления для {FARM_TYPE_LABELS[filterFarmType]}.
                    </td>
                  </tr>
                ) : norms.map(norm => (
                  <tr key={norm.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-medium">{getCategoryName(norm.animal_category_id)}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {SEASON_LABELS[norm.season]}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {norm.items.length} позиций · {norm.items.map(i =>
                        `${getFeedName(i.feed_item_id)} ${i.kg_per_day}кг`
                      ).slice(0, 2).join(', ')}{norm.items.length > 2 ? '...' : ''}
                    </td>
                    <td className="p-3 text-xs">{norm.valid_from}</td>
                    <td className="p-3">
                      <Button variant="ghost" size="icon" onClick={() => { setEditNorm(norm); setShowForm(true) }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <NormDialog
          norm={editNorm}
          defaultFarmType={filterFarmType}
          categories={categories || []}
          feedItems={feedItems || []}
          onClose={() => { setShowForm(false); setEditNorm(null) }}
          onSaved={() => { setShowForm(false); setEditNorm(null); refetch() }}
        />
      )}
    </div>
  )
}

// ─── Norm Dialog ──────────────────────────────────────────────────────────────

function NormDialog({ norm, defaultFarmType, categories, feedItems, onClose, onSaved }: {
  norm: FeedConsumptionNorm | null
  defaultFarmType: string
  categories: AnimalCategory[]
  feedItems: FeedItem[]
  onClose: () => void
  onSaved: () => void
}) {
  const [farmType, setFarmType] = useState(norm?.farm_type || defaultFarmType)
  const [categoryId, setCategoryId] = useState(norm?.animal_category_id || '')
  const [season, setSeason] = useState(norm?.season || 'winter')
  const [items, setItems] = useState<Array<{ feed_item_id: string; kg_per_day: string }>>(
    norm?.items.map(i => ({ feed_item_id: i.feed_item_id, kg_per_day: String(i.kg_per_day) })) || []
  )
  const [validFrom, setValidFrom] = useState(norm?.valid_from || new Date().toISOString().split('T')[0])

  const upsert = useRpcMutation<Record<string, unknown>, { norm_id: string }>(
    'rpc_upsert_feed_consumption_norm',
    {
      successMessage: norm ? 'Норма обновлена' : 'Норма добавлена',
      onSuccess: () => onSaved(),
    }
  )

  const addItem = () => setItems(prev => [...prev, { feed_item_id: '', kg_per_day: '' }])
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))
  const updateItem = (idx: number, field: 'feed_item_id' | 'kg_per_day', value: string) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))

  const handleSave = () => {
    const parsedItems = items
      .filter(i => i.feed_item_id && i.kg_per_day)
      .map(i => ({ feed_item_id: i.feed_item_id, kg_per_day: parseFloat(i.kg_per_day) }))

    if (!categoryId || parsedItems.length === 0) {
      return toast.error('Укажите категорию и хотя бы один корм')
    }

    upsert.mutate({
      p_norm_id: norm?.id || null,
      p_farm_type: farmType,
      p_animal_category_id: categoryId,
      p_season: season,
      p_items: parsedItems,
      p_valid_from: validFrom,
    })
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{norm ? 'Редактировать норму' : 'Новая норма кормления'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Тип фермы</Label>
              <Select value={farmType} onValueChange={setFarmType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FARM_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Категория</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Выберите..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name_ru}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Сезон</Label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SEASON_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Действует с</Label>
            <Input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className="h-8 text-xs w-40" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Корма и нормы (кг/голову/день)</Label>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" /> Добавить
              </Button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Select value={item.feed_item_id} onValueChange={v => updateItem(idx, 'feed_item_id', v)}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Корм..." /></SelectTrigger>
                  <SelectContent>
                    {feedItems.map(f => (
                      <SelectItem key={f.id} value={f.id} className="text-xs">{f.name_ru}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="кг/день"
                  value={item.kg_per_day}
                  onChange={e => updateItem(idx, 'kg_per_day', e.target.value)}
                  className="h-8 text-xs w-24"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(idx)}>
                  ×
                </Button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground">Добавьте корма для этой нормы</p>
            )}
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
