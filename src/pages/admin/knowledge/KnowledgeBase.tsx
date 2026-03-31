/**
 * A03 — База знаний (Knowledge Base)
 * Dok 6 Slice 6a: /admin/knowledge
 * Auth: fn_is_admin(). RPC: rpc_add_knowledge_chunk (RPC-44). D-S6-1: .from() for list.
 */
import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useRpcMutation } from '@/hooks/useRpc'
import { supabase } from '@/lib/supabase'

interface Chunk { id: string; title: string; source_domain: string; language: string; is_published: boolean; content: string; created_at: string }

const DOMAIN_LABELS: Record<string, string> = {
  veterinary: 'Ветеринария', zootechnical: 'Зоотехния', tsp: 'ТСП', legal: 'Право', education: 'Обучение', faq: 'FAQ',
}

export function KnowledgeBase() {
  const { organization } = useAuth()
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [domain, setDomain] = useState('faq')

  const load = () => {
    let q = supabase.from('knowledge_chunks').select('id, title, source_domain, language, is_published, content, created_at').order('created_at', { ascending: false }).limit(50)
    if (search) q = q.ilike('title', `%${search}%`)
    q.then(({ data }) => { setChunks(data || []); setLoading(false) })
  }

  useEffect(() => { load() }, [search])

  const addMutation = useRpcMutation('rpc_add_knowledge_chunk', {
    successMessage: 'Чанк добавлен',
    onSuccess: () => { setShowAdd(false); setTitle(''); setContent(''); load() },
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">База знаний</h1>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Добавить</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый чанк</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Заголовок</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div><Label>Домен</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={domain} onChange={e => setDomain(e.target.value)}>
                  {Object.entries(DOMAIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><Label>Содержание</Label><textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]" value={content} onChange={e => setContent(e.target.value)} /></div>
              <Button className="w-full" disabled={!title || !content} onClick={() => addMutation.mutate({
                p_organization_id: organization!.id, p_title: title, p_content: content,
                p_source_domain: domain, p_is_published: false,
              } as any)}>Сохранить</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      {loading ? <Skeleton className="h-32 w-full" /> : chunks.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">База знаний пуста</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {chunks.map(ch => (
            <Card key={ch.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div><div className="font-medium">{ch.title}</div><p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ch.content}</p></div>
                  <div className="flex gap-1 flex-shrink-0 ml-3">
                    <Badge variant="secondary" className="text-xs">{DOMAIN_LABELS[ch.source_domain] || ch.source_domain}</Badge>
                    <Badge variant={ch.is_published ? 'default' : 'outline'} className="text-xs">{ch.is_published ? 'Опубл.' : 'Черновик'}</Badge>
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
