import { useAdminGuard } from '@/hooks/useAdminGuard'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function UserManagement() {
  const { isAdmin, checking: adminChecking } = useAdminGuard()
  if (adminChecking) return null
  if (!isAdmin) return null

  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let q = supabase.from('users').select('id, full_name, phone, email, is_active, created_at').order('created_at', { ascending: false }).limit(100)
    if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    q.then(({ data }) => { setUsers(data || []); setLoading(false) })
  }, [search])

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Пользователи</h1>
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Поиск по имени, телефону..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <Skeleton className="h-48 w-full" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Имя</th><th className="p-2">Телефон</th><th className="p-2">Email</th><th className="p-2">Статус</th><th className="p-2">Дата</th>
            </tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="p-2 font-medium">{u.full_name || '—'}</td>
                <td className="p-2">{u.phone || '—'}</td>
                <td className="p-2 text-xs">{u.email}</td>
                <td className="p-2"><Badge variant={u.is_active ? 'default' : 'outline'}>{u.is_active ? 'Активен' : 'Неактивен'}</Badge></td>
                <td className="p-2 text-xs">{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
