/**
 * A05 — Аудит лог (Audit Log)
 * Dok 6 Slice 6a: /admin/audit
 * Auth: fn_is_admin(). Read-only. D-S6-1: .from() with admin RLS.
 */
import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

interface AuditEntry {
  id: string; action: string; entity_type: string; entity_id: string
  actor_type: string; organization_id: string; changes: any; created_at: string
}

export function AuditLog() {
  const { isAdmin, checking: adminChecking } = useAdminGuard()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setEntries(data || []); setLoading(false) })
  }, [])

  if (adminChecking) return <div className="page">Проверка доступа...</div>
  if (!isAdmin) return null

  return (
    <div className="page space-y-6">
      <h1 className="text-2xl font-semibold">Журнал аудита</h1>
      {loading ? <Skeleton className="h-32 w-full" /> : entries.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Нет записей</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="pb-2">Время</th><th className="pb-2">Действие</th>
              <th className="pb-2">Сущность</th><th className="pb-2">Актор</th>
            </tr></thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className="py-2 text-xs">{new Date(e.created_at).toLocaleString('ru-RU')}</td>
                  <td className="py-2"><Badge variant="outline" className="text-xs">{e.action}</Badge></td>
                  <td className="py-2 text-xs">{e.entity_type}<br/><span className="text-muted-foreground">{e.entity_id?.slice(0,8)}...</span></td>
                  <td className="py-2 text-xs">{e.actor_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
