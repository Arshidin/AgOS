import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useRpcMutation } from '@/hooks/useRpc'
import { supabase } from '@/lib/supabase'

export function RoleAssignment() {
  const { organization } = useAuth()
  const [admins, setAdmins] = useState<any[]>([])
  const [experts, setExperts] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [roleType, setRoleType] = useState('admin')
  const [loading, setLoading] = useState(true)

  const load = () => {
    Promise.all([
      supabase.from('admin_roles').select('*, users(full_name, email)').eq('is_active', true),
      supabase.from('expert_profiles').select('*, users(full_name, email)').eq('is_active', true),
    ]).then(([a, e]) => { setAdmins(a.data || []); setExperts(e.data || []); setLoading(false) })
  }
  useEffect(load, [])

  const assignMutation = useRpcMutation('rpc_assign_role', {
    successMessage: 'Роль назначена', onSuccess: () => { load(); setUserId('') },
  })

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Управление ролями</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Назначить роль</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>User ID</Label><Input value={userId} onChange={e => setUserId(e.target.value)} placeholder="UUID пользователя" /></div>
          <div><Label>Тип роли</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={roleType} onChange={e => setRoleType(e.target.value)}>
              <option value="admin">Администратор</option>
              <option value="expert">Эксперт</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button disabled={!userId} onClick={() => assignMutation.mutate({ p_organization_id: organization?.id || '', p_target_user_id: userId, p_role_type: roleType, p_action: 'grant' } as any)}>Назначить</Button>
            <Button variant="outline" disabled={!userId} onClick={() => assignMutation.mutate({ p_organization_id: organization?.id || '', p_target_user_id: userId, p_role_type: roleType, p_action: 'revoke' } as any)}>Отозвать</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <Skeleton className="h-32 w-full" /> : (
        <>
          <Card><CardHeader><CardTitle className="text-lg">Администраторы ({admins.length})</CardTitle></CardHeader>
            <CardContent>{admins.map(a => <div key={a.id} className="py-1 text-sm">{(a as any).users?.full_name || (a as any).users?.email || a.user_id}</div>)}{admins.length === 0 && <p className="text-sm text-muted-foreground">Нет</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">Эксперты ({experts.length})</CardTitle></CardHeader>
            <CardContent>{experts.map(e => <div key={e.id} className="py-1 text-sm">{(e as any).users?.full_name || (e as any).users?.email || e.user_id} <Badge variant="secondary" className="text-xs ml-2">{e.specialization}</Badge></div>)}{experts.length === 0 && <p className="text-sm text-muted-foreground">Нет</p>}</CardContent></Card>
        </>
      )}
    </div>
  )
}
