/**
 * M05 — Эпидемиологические сигналы
 * Dok 6 Slice 6a: /admin/expert/epidemic
 * D-S6-1: .from() with expert RLS.
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useExpertGuard } from '@/hooks/useExpertGuard'
import { supabase } from '@/lib/supabase'

interface Signal {
  id: string; severity: string; status: string; case_count: number
  time_window_days: number; detected_at: string; notes: string | null
}

const SEV_STYLES: Record<string, React.CSSProperties> = {
  emergency: { background: 'var(--red)',   color: 'var(--cta-fg)' },
  alert:     { background: 'var(--amber)', color: 'var(--cta-fg)' },
  warning:   { background: 'var(--amber)', color: 'var(--cta-fg)' },
  watch:     { background: 'var(--blue)',  color: 'var(--cta-fg)' },
}

export function EpidemicSignals() {
  const { isExpert, checking: expertChecking } = useExpertGuard()
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('epidemic_signals').select('*').order('detected_at', { ascending: false }).limit(30)
      .then(({ data }) => { setSignals(data || []); setLoading(false) })
  }, [])

  if (expertChecking) return <div className="p-6">Проверка доступа...</div>
  if (!isExpert) return null

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Эпидемиология</h1>
      {loading ? <Skeleton className="h-32 w-full" /> : signals.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Нет активных сигналов</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {signals.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge className="text-xs" style={SEV_STYLES[s.severity]}>{s.severity}</Badge>
                  <Badge variant="secondary" className="text-xs">{s.status}</Badge>
                  <span className="text-sm text-muted-foreground ml-auto">{new Date(s.detected_at).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="mt-2 text-sm">{s.case_count} случаев за {s.time_window_days} дн.</div>
                {s.notes && <p className="mt-1 text-sm text-muted-foreground">{s.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
