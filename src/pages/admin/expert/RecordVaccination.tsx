/**
 * M04 — Запись вакцинации
 * Dok 6 Slice 6a: /admin/expert/vaccination/:planId/record
 * RPC: rpc_record_vaccination (RPC-31)
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useExpertGuard } from '@/hooks/useExpertGuard'
import { useRpcMutation } from '@/hooks/useRpc'
import { supabase } from '@/lib/supabase'

interface PlanItem {
  id: string; scheduled_date: string; head_count_planned: number
  status: string; dose_number: number; herd_group_id: string
}

export function RecordVaccination() {
  const { isExpert, checking: expertChecking } = useExpertGuard()
  const navigate = useNavigate()
  const { planId } = useParams()
  const { organization } = useAuth()
  const [items, setItems] = useState<PlanItem[]>([])
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [vetProductId, setVetProductId] = useState<string>('')
  const [vetProducts, setVetProducts] = useState<Array<{id: string; name_ru: string}>>([])
  const [heads, setHeads] = useState('')
  const [batchNum, setBatchNum] = useState('')
  const [, setLoading] = useState(true)

  useEffect(() => {
    if (!planId) return
    supabase.from('vaccination_plan_items').select('*')
      .eq('vaccination_plan_id', planId).in('status', ['scheduled', 'reminded', 'overdue'])
      .order('scheduled_date')
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [planId])

  useEffect(() => {
    supabase.from('vet_products').select('id, name_ru')
      .eq('product_type', 'vaccine').eq('is_active', true)
      .then(({ data }) => { setVetProducts(data || []) })
  }, [])

  const recordMutation = useRpcMutation('rpc_record_vaccination', {
    successMessage: 'Вакцинация записана',
    onSuccess: () => navigate('/admin/expert/vaccination'),
  })

  if (expertChecking) return <div className="p-6">Проверка доступа...</div>
  if (!isExpert) return null

  return (
    <div className="space-y-6 p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/expert/vaccination')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-semibold">Запись вакцинации</h1>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Нет пунктов для записи</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-lg">Выберите пункт плана</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedItem} onChange={e => setSelectedItem(e.target.value)}>
              <option value="">Выберите...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {new Date(item.scheduled_date).toLocaleDateString('ru-RU')} — {item.head_count_planned} гол. (доза {item.dose_number})
                </option>
              ))}
            </select>
            <div><Label>Препарат (вакцина) *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={vetProductId} onChange={e => setVetProductId(e.target.value)} required>
                <option value="">Выберите вакцину</option>
                {vetProducts.map(vp => <option key={vp.id} value={vp.id}>{vp.name_ru}</option>)}
              </select>
            </div>
            <div><Label>Кол-во привитых голов *</Label><Input type="number" min={1} value={heads} onChange={e => setHeads(e.target.value)} required /></div>
            <div><Label>Номер серии вакцины (D101)</Label><Input value={batchNum} onChange={e => setBatchNum(e.target.value)} placeholder="Для экспортного сертификата" /></div>
            <Button className="w-full" disabled={!selectedItem || !vetProductId || !heads} onClick={() => recordMutation.mutate({
              p_organization_id: organization!.id, p_vaccination_plan_item_id: selectedItem,
              p_vet_product_id: vetProductId, p_actual_heads_vaccinated: parseInt(heads),
              p_vaccine_batch_number: batchNum || null,
            } as any)}>Записать вакцинацию</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
