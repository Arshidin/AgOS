/**
 * Consulting Dashboard — список инвестиционных проектов
 * Route: /admin/consulting
 * RPC: rpc_list_consulting_projects, rpc_create_consulting_project
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calculator, TrendingUp, LayoutGrid, ChevronDown, ArrowUpDown, ArrowRight } from 'lucide-react'
import { useSetTopbar } from '@/components/layout/TopbarContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
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

const COL_TEMPLATE = '32px minmax(180px,2fr) 110px minmax(120px,1fr) 110px 90px 32px'

export function ConsultingDashboard() {
  const navigate = useNavigate()
  const { organization } = useAuth()
  const [projects, setProjects] = useState<ConsultingProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const orgId = organization?.id

  useSetTopbar({
    title: 'Инвестиционные проекты',
    actions: (
      <Button onClick={() => setShowCreate(true)} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        Новый проект
      </Button>
    ),
  })

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
      navigate(`/admin/consulting/${data}/edit`)
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

  if (loading) {
    return (
      <div className="flex flex-col border border-border/60 rounded-[10px] overflow-hidden bg-background">
        {/* Level 2 skeleton */}
        <div className="flex items-center h-10 px-4 border-b border-border/60">
          <Skeleton className="h-[26px] w-32 rounded-md" />
        </div>
        {/* Table header skeleton */}
        <div className="grid border-b border-border/60 bg-muted/40" style={{ gridTemplateColumns: COL_TEMPLATE }}>
          {[32, 180, 110, 120, 110, 90, 32].map((w, i) => (
            <div key={i} className="h-[34px] px-2.5 flex items-center border-r border-border/60 last:border-r-0">
              {i > 0 && i < 6 && <Skeleton className="h-3" style={{ width: w * 0.5 }} />}
            </div>
          ))}
        </div>
        {/* Row skeletons */}
        {[1, 2, 3].map(i => (
          <div key={i} className="grid border-b border-border/60" style={{ gridTemplateColumns: COL_TEMPLATE }}>
            <div className="h-[46px] flex items-center justify-center border-r border-border/60">
              <Skeleton className="w-3.5 h-3.5 rounded-[3px]" />
            </div>
            <div className="h-[46px] px-2.5 flex items-center gap-2 border-r border-border/60">
              <Skeleton className="w-[22px] h-[22px] rounded-[5px] flex-shrink-0" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="h-[46px] px-2.5 flex items-center border-r border-border/60">
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="h-[46px] px-2.5 flex items-center border-r border-border/60">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="h-[46px] px-2.5 flex items-center justify-end border-r border-border/60">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="h-[46px] px-2.5 flex items-center justify-end border-r border-border/60">
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="h-[46px] flex items-center justify-center">
              <Skeleton className="w-3.5 h-3.5 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col border border-border/60 rounded-[10px] overflow-hidden bg-background">

      {/* ── УРОВЕНЬ 2: Переключатель вида ── */}
      <div className="flex items-center h-10 px-4 border-b border-border/60 gap-2">
        <div className="h-[26px] px-2.5 rounded-md border border-border/60 text-[12px] text-foreground flex items-center gap-1.5 cursor-pointer select-none">
          <LayoutGrid className="w-3 h-3 opacity-60" />
          Все проекты
          <ChevronDown className="w-3 h-3 opacity-40 ml-0.5" />
        </div>
      </div>

      {/* ── ТАБЛИЦА ── */}
      {projects.length === 0 ? (
        <Card className="rounded-none border-0">
          <CardContent className="flex flex-col items-center py-12">
            <Calculator className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-medium">Нет проектов</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Создайте первый инвестиционный проект для расчёта финансовой модели.
            </p>
            <Button onClick={() => setShowCreate(true)} className="mt-4" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Создать проект
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Заголовок таблицы */}
          <div
            className="grid border-b border-border/60 bg-muted/40"
            style={{ gridTemplateColumns: COL_TEMPLATE }}
          >
            <div className="h-[34px] border-r border-border/60" />
            <div className="h-[34px] px-2.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground border-r border-border/60">
              Проект
              <ArrowUpDown className="w-2.5 h-2.5 opacity-50" />
            </div>
            <div className="h-[34px] px-2.5 flex items-center text-[11px] font-medium text-muted-foreground border-r border-border/60">
              Статус
            </div>
            <div className="h-[34px] px-2.5 flex items-center text-[11px] font-medium text-muted-foreground border-r border-border/60">
              Тип хозяйства
            </div>
            <div className="h-[34px] px-2.5 flex items-center justify-end text-[11px] font-medium text-muted-foreground border-r border-border/60">
              NPV, тыс.
            </div>
            <div className="h-[34px] px-2.5 flex items-center justify-end text-[11px] font-medium text-muted-foreground border-r border-border/60">
              IRR
            </div>
            <div className="h-[34px]" />
          </div>

          {/* Строки */}
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/admin/consulting/${p.id}`)}
              className="grid border-b border-border/60 cursor-pointer hover:bg-muted/40 transition-colors group"
              style={{ gridTemplateColumns: COL_TEMPLATE }}
            >
              {/* Чекбокс */}
              <div className="flex items-center justify-center border-r border-border/60">
                <div className="w-3.5 h-3.5 rounded-[3px] border border-border/60" />
              </div>

              {/* Название */}
              <div className="px-2.5 h-[46px] flex items-center gap-2 border-r border-border/60">
                <div className="w-[22px] h-[22px] rounded-[5px] border border-border/60 bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground flex-shrink-0">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[13px] font-medium truncate">{p.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
              </div>

              {/* Статус */}
              <div className="px-2.5 h-[46px] flex items-center border-r border-border/60">
                <Badge variant={STATUS_MAP[p.status]?.variant || 'secondary'}>
                  {STATUS_MAP[p.status]?.label || p.status}
                </Badge>
              </div>

              {/* Тип хозяйства */}
              <div className="px-2.5 h-[46px] flex items-center border-r border-border/60">
                <span className="text-[12px] text-muted-foreground truncate">
                  {FARM_TYPE_MAP[p.farm_type] || p.farm_type}
                </span>
              </div>

              {/* NPV */}
              <div className="px-2.5 h-[46px] flex items-center justify-end border-r border-border/60">
                {p.latest_version ? (
                  <span className={cn(
                    'text-[13px] font-medium tabular-nums',
                    p.latest_version.npv === null ? 'text-muted-foreground' :
                    p.latest_version.npv < 0 ? 'text-destructive' :
                    'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {formatNumber(p.latest_version.npv)}
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground">—</span>
                )}
              </div>

              {/* IRR */}
              <div className="px-2.5 h-[46px] flex items-center justify-end border-r border-border/60">
                {p.latest_version ? (
                  <span className={cn(
                    'text-[13px] font-medium tabular-nums',
                    p.latest_version.irr === null ? 'text-muted-foreground' :
                    p.latest_version.irr < 0 ? 'text-destructive' :
                    'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {formatPercent(p.latest_version.irr)}
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground">—</span>
                )}
              </div>

              {/* Иконка */}
              <div className="flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          ))}

          {/* Футер таблицы */}
          <div
            className="grid bg-muted/40"
            style={{ gridTemplateColumns: COL_TEMPLATE }}
          >
            <div className="h-[30px] border-r border-border/60" />
            <div className="h-[30px] px-2.5 flex items-center border-r border-border/60">
              <span className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{projects.length}</span> проектов
              </span>
            </div>
            <div className="h-[30px] border-r border-border/60" />
            <div className="h-[30px] border-r border-border/60" />
            <div className="h-[30px] border-r border-border/60" />
            <div className="h-[30px] border-r border-border/60" />
            <div className="h-[30px]" />
          </div>
        </>
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
