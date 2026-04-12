import { useAdminGuard } from '@/hooks/useAdminGuard'
import { Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSetTopbar } from '@/components/layout/TopbarContext'

export function SystemSettings() {
  useSetTopbar({ title: 'Настройки', titleIcon: <Settings size={15} /> })
  const { isAdmin, checking: adminChecking } = useAdminGuard()
  if (adminChecking) return <div className="page">Проверка доступа...</div>
  if (!isAdmin) return null

  return (
    <div className="page space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Статус платформы</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between"><span className="text-muted-foreground">Frontend</span><Badge>ag-os.vercel.app</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">AI Gateway</span><Badge>agos-production.up.railway.app</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Database</span><Badge>Supabase (ap-south-1)</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Слайсы</span><Badge variant="secondary">0–6b complete</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Экраны</span><Badge variant="secondary">38+</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">RPCs</span><Badge variant="secondary">35+</Badge></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">Заблокировано</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between"><span>Legal Gate (Article 171)</span><Badge variant="destructive">D-LEGAL-1: deferred</Badge></div>
          <div className="flex justify-between"><span>Slice 7 (Education)</span><Badge variant="outline">Ready</Badge></div>
        </CardContent>
      </Card>
    </div>
  )
}
