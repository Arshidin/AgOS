/**
 * A04 — Ограничения (Health Restrictions)
 * Dok 6 Slice 6a: /admin/restrictions
 * Auth: fn_is_admin(). RPC: rpc_restrict_organization (RPC-45). D-S6-1: .from() for list.
 */
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

interface Restriction {
  id: string; restriction_type: string; organization_id: string; herd_group_id: string
  starts_at: string; ends_at: string; is_active: boolean
}

const TYPE_LABELS: Record<string, string> = {
  medication_withdrawal: 'Период ожидания', quarantine: 'Карантин',
  disease_suspected: 'Подозрение', lab_pending: 'Ожидание анализов',
}

export function Restrictions() {
  const [restrictions, setRestrictions] = useState<Restriction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('health_restrictions').select('*').order('starts_at', { ascending: false }).limit(50)
      .then(({ data }) => { setRestrictions(data || []); setLoading(false) })
  }, [])

  const active = restrictions.filter(r => r.is_active)
  const expired = restrictions.filter(r => !r.is_active)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ограничения</h1>
        <Button><Plus className="mr-2 h-4 w-4" />Создать</Button>
      </div>
      {loading ? <Skeleton className="h-32 w-full" /> : (
        <>
          <h3 className="font-medium">Активные ({active.length})</h3>
          {active.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Нет активных ограничений</CardContent></Card>
          ) : active.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <Badge variant="destructive" className="text-xs">{TYPE_LABELS[r.restriction_type] || r.restriction_type}</Badge>
                  <div className="text-sm mt-1">до {new Date(r.ends_at).toLocaleDateString('ru-RU')}</div>
                </div>
                <Button variant="outline" size="sm">Снять</Button>
              </CardContent>
            </Card>
          ))}
          {expired.length > 0 && (
            <>
              <h3 className="font-medium text-muted-foreground">Истёкшие ({expired.length})</h3>
              {expired.map(r => (
                <Card key={r.id} className="opacity-60">
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="text-xs">{TYPE_LABELS[r.restriction_type] || r.restriction_type}</Badge>
                    <div className="text-sm mt-1 text-muted-foreground">{new Date(r.starts_at).toLocaleDateString('ru-RU')} — {new Date(r.ends_at).toLocaleDateString('ru-RU')}</div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}
