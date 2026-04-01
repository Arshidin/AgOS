import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useRpcMutation } from '@/hooks/useRpc'
import { supabase } from '@/lib/supabase'

export function PriceGridManagement() {
  const { organization } = useAuth()
  const [prices, setPrices] = useState<any[]>([])
  const [skus, setSkus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [skuId, setSkuId] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [premium, setPremium] = useState('0')

  const load = () => {
    Promise.all([
      supabase.from('price_grids').select('*, tsp_skus(name_ru)').eq('is_active', true).order('base_price_per_kg', { ascending: false }),
      supabase.from('tsp_skus').select('id, name_ru').eq('available', true).order('sort_order'),
    ]).then(([p, s]) => { setPrices(p.data || []); setSkus(s.data || []); setLoading(false) })
  }
  useEffect(load, [])

  const setMutation = useRpcMutation('rpc_set_price_grid', {
    successMessage: 'Цена обновлена', onSuccess: () => { load(); setSkuId(''); setBasePrice(''); setPremium('0') },
  })

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Управление ценами</h1>

      {/* Set price form */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Установить цену</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Категория ТСП</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={skuId} onChange={e => setSkuId(e.target.value)}>
              <option value="">Выберите...</option>
              {skus.map(s => <option key={s.id} value={s.id}>{s.name_ru}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Базовая цена (₸/кг)</Label><Input type="number" min={1} value={basePrice} onChange={e => setBasePrice(e.target.value)} /></div>
            <div><Label>Премиум (₸/кг)</Label><Input type="number" min={0} value={premium} onChange={e => setPremium(e.target.value)} /></div>
          </div>
          <Button disabled={!skuId || !basePrice} onClick={() => setMutation.mutate({
            p_organization_id: organization?.id, p_sku_id: skuId,
            p_base_price_per_kg: parseInt(basePrice), p_premium_per_kg: parseInt(premium || '0'),
          } as any)}>Сохранить</Button>
        </CardContent>
      </Card>

      {/* Current prices */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Текущие цены</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-32 w-full" /> : prices.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Цены не установлены</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Категория</th><th className="p-2 text-right">Базовая</th><th className="p-2 text-right">Премиум</th>
              </tr></thead>
              <tbody>{prices.map(p => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="p-2">{p.tsp_skus?.name_ru || '—'}</td>
                  <td className="p-2 text-right font-medium">{p.base_price_per_kg?.toLocaleString('ru-RU')} ₸</td>
                  <td className="p-2 text-right">{p.premium_per_kg > 0 ? `+${p.premium_per_kg}` : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
