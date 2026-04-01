/**
 * A15 — Управление ценами
 * Dok 6 Slice 5b: /admin/pricing
 * RPCs: rpc_set_price_grid (19), rpc_publish_price_index_value (20)
 * Article 171: antitrust disclaimer MUST be visible (price data shown)
 * D-S6-1: .from() accepted for M/A-series admin reads
 */
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useRpcMutation } from '@/hooks/useRpc'
import { supabase } from '@/lib/supabase'

const DISCLAIMER = 'Справочные цены являются индикативными рыночными ориентирами и не являются обязательными для применения. Участие добровольное. Ст. 171 ПК РК.'

export function PriceGridManagement() {
  const { isAdmin, checking: adminChecking } = useAdminGuard()
  const { organization } = useAuth()

  // Price grid state
  const [prices, setPrices] = useState<any[]>([])
  const [skus, setSkus] = useState<any[]>([])
  const [loadingPrices, setLoadingPrices] = useState(true)
  const [skuId, setSkuId] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [premium, setPremium] = useState('0')

  // Price index state
  const [indices, setIndices] = useState<any[]>([])
  const [indexValues, setIndexValues] = useState<any[]>([])
  const [loadingIndex, setLoadingIndex] = useState(true)
  const [selectedIndexId, setSelectedIndexId] = useState('')
  const [indexPeriod, setIndexPeriod] = useState('')
  const [indexValue, setIndexValue] = useState('')

  const loadPrices = () => {
    Promise.all([
      supabase
        .from('price_grids')
        .select('*, tsp_skus(name_ru)')
        .eq('is_active', true)
        .order('base_price_per_kg', { ascending: false }),
      supabase
        .from('tsp_skus')
        .select('id, name_ru')
        .eq('available', true)
        .order('sort_order'),
    ]).then(([p, s]) => {
      setPrices(p.data || [])
      setSkus(s.data || [])
      setLoadingPrices(false)
    })
  }

  const loadIndices = () => {
    Promise.all([
      supabase.from('price_indices').select('id, code, name_ru').eq('is_active', true).order('name_ru'),
      supabase
        .from('price_index_values')
        .select('*, price_indices(name_ru, code)')
        .eq('published', true)
        .order('period_date', { ascending: false })
        .limit(20),
    ]).then(([idx, vals]) => {
      setIndices(idx.data || [])
      setIndexValues(vals.data || [])
      setLoadingIndex(false)
    })
  }

  useEffect(() => { loadPrices(); loadIndices() }, [])

  // RPC-19: upsert price grid
  const setMutation = useRpcMutation('rpc_set_price_grid', {
    successMessage: 'Цена обновлена',
    onSuccess: () => { loadPrices(); setSkuId(''); setBasePrice(''); setPremium('0') },
  })

  // RPC-20: publish price index value
  // NOTE: DEF-026 — RPC-20 has column mismatch in d02_tsp.sql (DB Agent must fix before this call works)
  const publishIndexMutation = useRpcMutation('rpc_publish_price_index_value', {
    successMessage: 'Значение индекса опубликовано',
    onSuccess: () => { loadIndices(); setSelectedIndexId(''); setIndexPeriod(''); setIndexValue('') },
  })

  if (adminChecking) return <div className="p-6">Проверка доступа...</div>
  if (!isAdmin) return null

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Управление ценами</h1>

      {/* DEF-024: Antitrust disclaimer — Article 171, mandatory on all price screens A11–A15 */}
      <Card className="border-amber-500/30 bg-amber-50/50">
        <CardContent className="p-4 text-sm text-amber-800">{DISCLAIMER}</CardContent>
      </Card>

      {/* ── Price Grid ── */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Установить справочную цену</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Категория ТСП</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={skuId}
              onChange={e => setSkuId(e.target.value)}
            >
              <option value="">Выберите...</option>
              {skus.map(s => <option key={s.id} value={s.id}>{s.name_ru}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Базовая цена (₸/кг)</Label>
              <Input type="number" min={1} value={basePrice} onChange={e => setBasePrice(e.target.value)} />
            </div>
            <div>
              <Label>Премиум (₸/кг)</Label>
              <Input type="number" min={0} value={premium} onChange={e => setPremium(e.target.value)} />
            </div>
          </div>
          <Button
            disabled={!skuId || !basePrice || setMutation.isPending}
            onClick={() => setMutation.mutate({
              p_organization_id: organization?.id,
              p_sku_id: skuId,
              p_base_price_per_kg: parseInt(basePrice),
              p_premium_per_kg: parseInt(premium || '0'),
            } as any)}
          >
            Сохранить
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Текущие справочные цены</CardTitle></CardHeader>
        <CardContent>
          {loadingPrices ? (
            <Skeleton className="h-32 w-full" />
          ) : prices.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Цены не установлены</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Категория</th>
                  <th className="p-2 text-right">Базовая</th>
                  <th className="p-2 text-right">Премиум</th>
                </tr>
              </thead>
              <tbody>
                {prices.map(p => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="p-2">{p.tsp_skus?.name_ru || '—'}</td>
                    <td className="p-2 text-right font-medium">{p.base_price_per_kg?.toLocaleString('ru-RU')} ₸</td>
                    <td className="p-2 text-right">{p.premium_per_kg > 0 ? `+${p.premium_per_kg}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* DEF-023: Price Index section — RPC-20 */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Публикация рыночного индекса</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Индекс</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedIndexId}
              onChange={e => setSelectedIndexId(e.target.value)}
            >
              <option value="">Выберите...</option>
              {indices.map(i => <option key={i.id} value={i.id}>{i.name_ru} ({i.code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Период (месяц)</Label>
              <Input
                type="month"
                value={indexPeriod}
                onChange={e => setIndexPeriod(e.target.value)}
              />
            </div>
            <div>
              <Label>Значение (₸/кг)</Label>
              <Input
                type="number"
                min={1}
                step="0.01"
                value={indexValue}
                onChange={e => setIndexValue(e.target.value)}
              />
            </div>
          </div>
          <Button
            disabled={!selectedIndexId || !indexPeriod || !indexValue || publishIndexMutation.isPending}
            onClick={() => publishIndexMutation.mutate({
              p_organization_id: organization?.id,
              p_index_id: selectedIndexId,
              p_period_date: indexPeriod + '-01',
              p_value: parseFloat(indexValue),
            } as any)}
          >
            Опубликовать
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">История индексов</CardTitle></CardHeader>
        <CardContent>
          {loadingIndex ? (
            <Skeleton className="h-24 w-full" />
          ) : indexValues.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Значения не опубликованы</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Индекс</th>
                  <th className="p-2">Период</th>
                  <th className="p-2 text-right">₸/кг</th>
                </tr>
              </thead>
              <tbody>
                {indexValues.map(v => (
                  <tr key={v.id} className="border-b border-border/50">
                    <td className="p-2">{(v as any).price_indices?.name_ru || '—'}</td>
                    <td className="p-2">{v.period_date ? new Date(v.period_date).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : '—'}</td>
                    <td className="p-2 text-right font-medium">{v.value_per_kg?.toLocaleString('ru-RU')} ₸</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
