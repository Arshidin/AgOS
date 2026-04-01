import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

export function PoolQueue() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('pool_requests').select('*, pools(id, status, matched_heads, target_heads)')
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setRequests(data || []); setLoading(false) })
  }, [])

  const ST: Record<string, string> = { draft: 'Черновик', active: 'Активен', closed: 'Закрыт', expired: 'Истёк' }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Пул-запросы</h1>
        <Button><Plus className="mr-2 h-4 w-4" />Создать</Button>
      </div>
      {loading ? <Skeleton className="h-32 w-full" /> : requests.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Нет запросов</CardContent></Card>
      ) : requests.map(r => {
        const pool = r.pools?.[0]
        return (
          <Card key={r.id} className="cursor-pointer hover:border-primary/50" onClick={() => pool ? navigate(`/admin/pools/${pool.id}`) : undefined}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{r.total_heads} голов · {r.target_month ? new Date(r.target_month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : ''}</div>
                {pool && <div className="text-sm text-muted-foreground">Пул: {pool.matched_heads}/{pool.target_heads} подобрано · {pool.status}</div>}
              </div>
              <Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{ST[r.status] || r.status}</Badge>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
