/**
 * Consulting Dashboard — список инвестиционных проектов
 * Route: /admin/consulting
 * RPC: rpc_list_consulting_projects, rpc_create_consulting_project
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Plus, Calculator, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface ConsultingProject {
  id: string
  name: string
  farm_type: string
  status: string
  created_at: string
  updated_at: string
  latest_version: {
    version_number: number
    calculated_at: string
    npv: number | null
    irr: number | null
  } | null
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: 'Черновик', variant: 'secondary' },
  calculating: { label: 'Расчёт...', variant: 'outline' },
  calculated: { label: 'Рассчитан', variant: 'default' },
  archived: { label: 'Архив', variant: 'secondary' },
}

const FARM_TYPE_MAP: Record<string, string> = {
  beef_reproducer: 'КРС Репродуктор',
  feedlot: 'Откормочная',
  sheep_goat: 'МРС',
}

export function ConsultingDashboard() {
  const navigate = useNavigate()
  const { organization } = useAuth()
  const [projects, setProjects] = useState<ConsultingProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const orgId = organization?.id

  const loadProjects = async () => {
    if (!orgId) return
    setLoading(true)
    const { data, error } = await supabase.rpc('rpc_list_consulting_projects', {
      p_organization_id: orgId,
    })
    if (error) {
      toast.error('Ошибка загрузки проектов')
      console.error(error)
    } else {
      setProjects(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadProjects() }, [orgId])

  const handleCreate = async () => {
    if (!orgId || !newName.trim()) return
    setCreating(true)
    const { data, error } = await supabase.rpc('rpc_create_consulting_project', {
      p_organization_id: orgId,
      p_name: newName.trim(),
      p_farm_type: 'beef_reproducer',
    })
    setCreating(false)
    if (error) {
      toast.error('Ошибка создания проекта')
      console.error(error)
    } else {
      toast.success('Проект создан')
      setShowCreate(false)
      setNewName('')
      navigate(`/admin/consulting/${data}`)
    }
  }

  const formatNumber = (n: number | null) => {
    if (n === null || n === undefined) return '—'
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n)
  }

  const formatPercent = (n: number | null) => {
    if (n === null || n === undefined || isNaN(n)) return '—'
    return `${(n * 100).toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-[var(--color-text-secondary)]" />
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            Консалтинг
          </h1>
          <Badge variant="outline">{projects.length} проектов</Badge>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Новый проект
        </Button>
      </div>

      {/* Project list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Calculator className="mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
            <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
              Нет проектов
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Создайте первый инвестиционный проект для расчёта финансовой модели.
            </p>
            <Button onClick={() => setShowCreate(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Создать проект
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <Card
              key={p.id}
              className="cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)]"
              onClick={() => navigate(`/admin/consulting/${p.id}`)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--color-text-primary)]">{p.name}</span>
                    <Badge variant={STATUS_MAP[p.status]?.variant || 'secondary'}>
                      {STATUS_MAP[p.status]?.label || p.status}
                    </Badge>
                    <Badge variant="outline">{FARM_TYPE_MAP[p.farm_type] || p.farm_type}</Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Создан {new Date(p.created_at).toLocaleDateString('ru-RU')}
                    {p.latest_version && ` · Версия ${p.latest_version.version_number}`}
                  </p>
                </div>
                {p.latest_version && (
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">NPV</p>
                      <p className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
                        {formatNumber(p.latest_version.npv)} тыс.
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">IRR</p>
                      <p className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
                        {formatPercent(p.latest_version.irr)}
                      </p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-[var(--color-text-muted)]" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый инвестиционный проект</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Название проекта</Label>
              <Input
                placeholder="Например: Ферма Караарна 300 голов"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
