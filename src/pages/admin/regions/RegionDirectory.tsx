import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

export function RegionDirectory() {
  const { isAdmin, checking: adminChecking } = useAdminGuard()
  const [regions, setRegions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('regions').select('id, code, name_ru, name_kk, parent_id').order('name_ru')
      .then(({ data }) => { setRegions(data || []); setLoading(false) })
  }, [])

  if (adminChecking) return <div className="p-6">Проверка доступа...</div>
  if (!isAdmin) return null

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Регионы</h1>
      {loading ? <Skeleton className="h-48 w-full" /> : (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="p-3">Код</th><th className="p-3">Название (RU)</th><th className="p-3">Название (KK)</th>
            </tr></thead>
            <tbody>{regions.map(r => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="p-3 font-mono text-xs">{r.code}</td>
                <td className="p-3">{r.name_ru}</td>
                <td className="p-3">{r.name_kk || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  )
}
