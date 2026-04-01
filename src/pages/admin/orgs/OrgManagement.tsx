import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function OrgManagement() {
  const [orgs, setOrgs] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let q = supabase.from('organizations').select('id, legal_name, bin_iin, phone, is_active, created_at').order('created_at', { ascending: false }).limit(100)
    if (search) q = q.ilike('legal_name', `%${search}%`)
    q.then(({ data }) => { setOrgs(data || []); setLoading(false) })
  }, [search])

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Организации</h1>
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <Skeleton className="h-48 w-full" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Название</th><th className="p-2">БИН/ИИН</th><th className="p-2">Телефон</th><th className="p-2">Дата</th>
            </tr></thead>
            <tbody>{orgs.map(o => (
              <tr key={o.id} className="border-b border-border/50">
                <td className="p-2 font-medium">{o.legal_name}</td>
                <td className="p-2">{o.bin_iin || '—'}</td>
                <td className="p-2">{o.phone || '—'}</td>
                <td className="p-2 text-xs">{new Date(o.created_at).toLocaleDateString('ru-RU')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
