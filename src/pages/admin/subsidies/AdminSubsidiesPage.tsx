import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/ui/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { SubsidyCategory } from '@/types/subsidy';

type ProgramRow = any;

function usePrograms() {
  return useQuery({
    queryKey: ['admin-subsidy-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subsidy_programs' as any)
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data as ProgramRow[];
    },
  });
}

const CATEGORIES: SubsidyCategory[] = ['livestock', 'crop', 'investment', 'irrigation'];

const EMPTY: Partial<ProgramRow> = {
  id: '', category: 'livestock', npa_reference: '', reg_number: '',
  name_ru: '', name_kz: '', name_en: '',
  description_ru: '', description_kz: '',
  recipients_ru: '', okved_codes: [],
  source_budget: 'Местный бюджет',
  submission_platform_url: '', submission_platform_name: '',
  submission_period: '', processing_days: null,
  reimbursement_rate_text: '', formula_text: '',
  obligations_ru: '', sanctions_ru: '',
  documents: [], steps: [], faq: [], eligibility_rules: [],
  order_index: 0, is_active: true,
};

export default function AdminSubsidiesPage() {
  const qc = useQueryClient();
  const { data: programs, isLoading } = usePrograms();
  const [editing, setEditing] = useState<Partial<ProgramRow> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (p: Partial<ProgramRow>) => {
      if (isNew) {
        const { error } = await supabase.from('subsidy_programs' as any).insert(p as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subsidy_programs' as any).update(p as any).eq('id', p.id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-subsidy-programs'] });
      toast.success(isNew ? 'Субсидия создана' : 'Субсидия обновлена');
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subsidy_programs' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-subsidy-programs'] });
      toast.success('Субсидия удалена');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (field: string, value: any) => {
    setEditing((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <AdminPageHeader title="Субсидии МСХ РК" actions={
        <Button size="sm" onClick={() => { setIsNew(true); setEditing({ ...EMPTY }); }}>
          <Plus className="h-4 w-4 mr-1" /> Добавить
        </Button>
      } />

      <div className="rounded-lg border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>НПА</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Загрузка…</TableCell></TableRow>}
            {programs?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-muted-foreground">{p.order_index}</TableCell>
                <TableCell className="font-mono text-xs">{p.id}</TableCell>
                <TableCell className="font-medium">{p.name_ru}</TableCell>
                <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                <TableCell className="text-xs">{p.npa_reference}</TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? 'default' : 'outline'} className={p.is_active ? 'bg-emerald-600' : ''}>
                    {p.is_active ? 'Активна' : 'Неактивна'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setIsNew(false); setEditing({ ...p }); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                      if (confirm(`Удалить «${p.name_ru}»?`)) deleteMutation.mutate(p.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Новая субсидия' : `Редактировать: ${editing?.name_ru || ''}`}</DialogTitle>
          </DialogHeader>
          {editing && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="basic">Основное</TabsTrigger>
                <TabsTrigger value="submit">Подача</TabsTrigger>
                <TabsTrigger value="content">Контент</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>ID (slug)</Label>
                    <Input value={editing.id || ''} onChange={(e) => set('id', e.target.value)} disabled={!isNew} />
                  </div>
                  <div>
                    <Label>Порядок</Label>
                    <Input type="number" value={editing.order_index ?? 0} onChange={(e) => set('order_index', Number(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Категория</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={editing.category || 'livestock'}
                      onChange={(e) => set('category', e.target.value)}
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label>Активна</Label>
                      <div className="pt-2">
                        <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => set('is_active', v)} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Название RU</Label><Input value={editing.name_ru || ''} onChange={(e) => set('name_ru', e.target.value)} /></div>
                  <div><Label>Название KZ</Label><Input value={editing.name_kz || ''} onChange={(e) => set('name_kz', e.target.value)} /></div>
                  <div><Label>Название EN</Label><Input value={editing.name_en || ''} onChange={(e) => set('name_en', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>НПА</Label><Input value={editing.npa_reference || ''} onChange={(e) => set('npa_reference', e.target.value)} /></div>
                  <div><Label>Регистр. номер</Label><Input value={editing.reg_number || ''} onChange={(e) => set('reg_number', e.target.value)} /></div>
                </div>
                <div><Label>Описание RU</Label><Textarea rows={3} value={editing.description_ru || ''} onChange={(e) => set('description_ru', e.target.value)} /></div>
                <div><Label>Получатели</Label><Textarea rows={2} value={editing.recipients_ru || ''} onChange={(e) => set('recipients_ru', e.target.value)} /></div>
              </TabsContent>

              <TabsContent value="submit" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Платформа</Label><Input value={editing.submission_platform_name || ''} onChange={(e) => set('submission_platform_name', e.target.value)} /></div>
                  <div><Label>URL платформы</Label><Input value={editing.submission_platform_url || ''} onChange={(e) => set('submission_platform_url', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Период подачи</Label><Input value={editing.submission_period || ''} onChange={(e) => set('submission_period', e.target.value)} /></div>
                  <div><Label>Дней на обработку</Label><Input type="number" value={editing.processing_days ?? ''} onChange={(e) => set('processing_days', e.target.value ? Number(e.target.value) : null)} /></div>
                </div>
                <div><Label>Ставка возмещения (текст)</Label><Input value={editing.reimbursement_rate_text || ''} onChange={(e) => set('reimbursement_rate_text', e.target.value)} /></div>
                <div><Label>Формула</Label><Textarea rows={2} value={editing.formula_text || ''} onChange={(e) => set('formula_text', e.target.value)} /></div>
              </TabsContent>

              <TabsContent value="content" className="space-y-3">
                <div><Label>Встречные обязательства</Label><Textarea rows={3} value={editing.obligations_ru || ''} onChange={(e) => set('obligations_ru', e.target.value)} /></div>
                <div><Label>Санкции</Label><Textarea rows={3} value={editing.sanctions_ru || ''} onChange={(e) => set('sanctions_ru', e.target.value)} /></div>
                <div>
                  <Label>Документы (JSON)</Label>
                  <Textarea rows={4} className="font-mono text-xs" value={JSON.stringify(editing.documents || [], null, 2)} onChange={(e) => {
                    try { set('documents', JSON.parse(e.target.value)); } catch { /* ignore invalid JSON while typing */ }
                  }} />
                </div>
                <div>
                  <Label>Шаги (JSON)</Label>
                  <Textarea rows={4} className="font-mono text-xs" value={JSON.stringify(editing.steps || [], null, 2)} onChange={(e) => {
                    try { set('steps', JSON.parse(e.target.value)); } catch { /* ignore invalid JSON while typing */ }
                  }} />
                </div>
                <div>
                  <Label>FAQ (JSON)</Label>
                  <Textarea rows={4} className="font-mono text-xs" value={JSON.stringify(editing.faq || [], null, 2)} onChange={(e) => {
                    try { set('faq', JSON.parse(e.target.value)); } catch { /* ignore invalid JSON while typing */ }
                  }} />
                </div>
                <div>
                  <Label>Wizard правила (JSON)</Label>
                  <Textarea rows={4} className="font-mono text-xs" value={JSON.stringify(editing.eligibility_rules || [], null, 2)} onChange={(e) => {
                    try { set('eligibility_rules', JSON.parse(e.target.value)); } catch { /* ignore invalid JSON while typing */ }
                  }} />
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
            <Button onClick={() => saveMutation.mutate(editing!)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
