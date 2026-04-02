/**
 * A12/A13/A14 — Pool Detail (pool lifecycle: filling → closed)
 * Dok 6 Slice 5b: /admin/pools/:poolId
 * RPCs: rpc_match_batch_to_pool (14), rpc_advance_pool_status (15), rpc_rollback_batch_match (16)
 * D40: contacts revealed ONLY at executing status transition
 * Article 171: antitrust disclaimer MUST be visible (price data shown)
 */
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useRpcMutation } from '@/hooks/useRpc'
import { supabase } from '@/lib/supabase'

const DISCLAIMER = 'Справочные цены являются индикативными рыночными ориентирами и не являются обязательными для применения. Участие добровольное. Ст. 171 ПК РК.'

const POOL_STATUS_ORDER = ['filling','filled','executing','dispatched','delivered','executed','closed']
const NEXT_STATUS: Record<string, string> = {
  filling: 'filled', filled: 'executing', executing: 'dispatched',
  dispatched: 'delivered', delivered: 'executed',
}

export function PoolDetail() {
  const { isAdmin, checking: adminChecking } = useAdminGuard()
  const navigate = useNavigate()
  const { poolId } = useParams()
  const { organization } = useAuth()
  const [pool, setPool] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [matchBatchId, setMatchBatchId] = useState('')
  const [matchHeads, setMatchHeads] = useState('')

  const load = () => {
    if (!poolId) return
    Promise.all([
      supabase.from('pools').select('*, pool_requests(*)').eq('id', poolId).single(),
      supabase.from('pool_matches').select('*, batches(id, heads, tsp_sku_id, status)').eq('pool_id', poolId),
      supabase.from('batches').select('id, heads, avg_weight_kg, status, tsp_sku_id').eq('status', 'published').limit(50),
    ]).then(([p, m, b]) => {
      setPool(p.data); setMatches(m.data || []); setBatches(b.data || []); setLoading(false)
    })
  }
  useEffect(load, [poolId])

  const matchMutation = useRpcMutation('rpc_match_batch_to_pool', {
    successMessage: 'Батч подобран', onSuccess: () => { load(); setMatchBatchId(''); setMatchHeads('') },
  })
  const advanceMutation = useRpcMutation('rpc_advance_pool_status', {
    successMessage: 'Статус обновлён', onSuccess: load,
  })
  const rollbackMutation = useRpcMutation('rpc_rollback_batch_match', {
    successMessage: 'Матч отменён', onSuccess: load,
  })

  if (adminChecking) return <div className="p-6">Проверка доступа...</div>
  if (!isAdmin) return null

  if (loading) return <div className="p-6"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-48 w-full" /></div>
  if (!pool) return <div className="p-6"><Button variant="ghost" onClick={() => navigate('/admin/pools')}><ArrowLeft className="mr-2 h-4 w-4" />Назад</Button><p className="mt-4 text-muted-foreground">Пул не найден</p></div>

  const nextStatus = NEXT_STATUS[pool.status]
  const isContactRevealed = !!pool.mpk_contact_revealed_at

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/pools')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-semibold">Пул</h1>
        <Badge>{pool.status}</Badge>
      </div>

      {/* DEF-024: Antitrust disclaimer — Article 171, mandatory on all price screens A11–A15 */}
      <Card className="border-amber-500/30 bg-amber-50/50">
        <CardContent className="p-3 text-xs text-amber-800">{DISCLAIMER}</CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Цель</span><span className="font-bold text-lg">{pool.target_heads} голов</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Подобрано</span><span className="font-bold text-lg">{pool.matched_heads} голов</span></div>
          {isContactRevealed && <div className="text-sm text-green-600 font-medium">Контакты раскрыты (D40)</div>}
          {/* FSM progress */}
          <div className="flex gap-1 mt-3">{POOL_STATUS_ORDER.map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s === pool.status ? 'bg-primary' : POOL_STATUS_ORDER.indexOf(s) < POOL_STATUS_ORDER.indexOf(pool.status) ? 'bg-primary/40' : 'bg-muted'}`} title={s} />
          ))}</div>
        </CardContent>
      </Card>

      {/* Matches */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Подобранные батчи ({matches.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {matches.map(m => (
            <div key={m.id} className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">{m.matched_heads} гол. · {m.reference_price_at_match ? `${m.reference_price_at_match} ₸/кг` : 'без цены'}</span>
              {pool.status === 'filling' && <Button size="sm" variant="outline" onClick={() => rollbackMutation.mutate({
                p_organization_id: organization?.id, p_pool_id: poolId, p_batch_id: m.batch_id,
              } as any)}>Откатить</Button>}
            </div>
          ))}
          {matches.length === 0 && <p className="text-sm text-muted-foreground">Нет подобранных батчей</p>}
        </CardContent>
      </Card>

      {/* Match new batch */}
      {pool.status === 'filling' && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Подобрать батч</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Батч</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={matchBatchId} onChange={e => setMatchBatchId(e.target.value)}>
                <option value="">Выберите...</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.heads} гол. · {b.avg_weight_kg || '?'} кг</option>)}
              </select>
            </div>
            <div><Label>Голов для матча</Label><Input type="number" min={1} value={matchHeads} onChange={e => setMatchHeads(e.target.value)} /></div>
            <Button disabled={!matchBatchId || !matchHeads} onClick={() => matchMutation.mutate({
              p_organization_id: organization?.id, p_pool_id: poolId, p_batch_id: matchBatchId, p_matched_heads: parseInt(matchHeads),
            } as any)}>Подобрать</Button>
          </CardContent>
        </Card>
      )}

      {/* Advance status */}
      {nextStatus && pool.status !== 'executed' && pool.status !== 'closed' && (
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => advanceMutation.mutate({
            p_organization_id: organization?.id, p_pool_id: poolId, p_new_status: nextStatus,
          } as any)}>
            {nextStatus === 'executing' ? 'Запустить исполнение (раскрыть контакты)' : `→ ${nextStatus}`}
          </Button>
          <Button variant="outline" onClick={() => advanceMutation.mutate({
            p_organization_id: organization?.id, p_pool_id: poolId, p_new_status: 'closed',
          } as any)}>Закрыть</Button>
        </div>
      )}
    </div>
  )
}
