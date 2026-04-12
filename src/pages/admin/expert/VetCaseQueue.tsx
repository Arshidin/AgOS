/**
 * M01 — Очередь ветеринарных кейсов (Expert Queue)
 * Dok 6 Slice 6a: /admin/expert/queue
 * Auth: fn_is_expert(). D-S6-1: uses .from() with expert RLS.
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import { useSetTopbar } from '@/components/layout/TopbarContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useExpertGuard } from '@/hooks/useExpertGuard'
import { supabase } from '@/lib/supabase'

interface VetCase {
  id: string; organization_id: string; farm_id: string
  severity: string | null; status: string; symptoms_text: string | null
  affected_head_count: number | null; created_at: string; created_via: string
}

const SEVERITY_STYLES: Record<string, React.CSSProperties> = {
  critical: { background: 'var(--red)', color: 'var(--cta-fg)' },
  severe:   { background: 'var(--amber)', color: 'var(--cta-fg)' },
  moderate: { background: 'var(--amber)', color: 'var(--cta-fg)' },
  mild:     { background: 'var(--green)', color: 'var(--cta-fg)' },
}
const STATUS_LABELS: Record<string, string> = {
  open: 'Открыт', in_progress: 'В работе', escalated: 'Эскалация', resolved: 'Закрыт',
}

export function VetCaseQueue() {
  const { isExpert, checking: expertChecking } = useExpertGuard()
  const navigate = useNavigate()
  useSetTopbar({ title: 'Ветеринарные кейсы', titleIcon: <Stethoscope size={15} /> })
  const [cases, setCases] = useState<VetCase[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('active')

  useEffect(() => {
    setLoading(true)
    let query = supabase.from('vet_cases').select('*').order('created_at', { ascending: false }).limit(50)
    if (statusFilter === 'active') query = query.in('status', ['open', 'in_progress', 'escalated'])
    else if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    query.then(({ data }) => { setCases(data || []); setLoading(false) })
  }, [statusFilter])

  if (expertChecking) return <div className="page">Проверка доступа...</div>
  if (!isExpert) return null

  return (
    <div className="page space-y-6">
      <div className="flex gap-2">
        {[{ key: 'active', label: 'Активные' }, { key: 'resolved', label: 'Закрытые' }, { key: 'all', label: 'Все' }].map(f => (
          <Button key={f.key} variant={statusFilter === f.key ? 'default' : 'outline'} size="sm"
            onClick={() => setStatusFilter(f.key)}>{f.label}</Button>
        ))}
      </div>
      {loading ? <Skeleton className="h-32 w-full" /> : cases.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Нет кейсов</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {cases.map(c => (
            <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/admin/expert/case/${c.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {c.severity && <Badge className="text-xs" style={SEVERITY_STYLES[c.severity]}>{c.severity}</Badge>}
                      <Badge variant="secondary" className="text-xs">{STATUS_LABELS[c.status] || c.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm line-clamp-2">{c.symptoms_text || 'Нет описания'}</p>
                    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                      {c.affected_head_count && <span>{c.affected_head_count} гол.</span>}
                      <span>{new Date(c.created_at).toLocaleDateString('ru-RU')}</span>
                      <span>{c.created_via}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
