import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/ui/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowRight } from 'lucide-react';

interface DepRow {
  id: string;
  program_id: string;
  depends_on_program_id: string | null;
  condition: Record<string, unknown>;
}

interface ProgramOption {
  id: string;
  name_ru: string;
}

function useDeps() {
  return useQuery({
    queryKey: ['admin-finance-deps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_program_deps')
        .select('*')
        .order('program_id');
      if (error) throw error;
      return data as DepRow[];
    },
  });
}

function useProgramOptions() {
  return useQuery({
    queryKey: ['admin-finance-program-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_programs')
        .select('id, name_ru')
        .order('order_index');
      if (error) throw error;
      return data as ProgramOption[];
    },
  });
}

const EMPTY_DEP: Partial<DepRow> = {
  program_id: '',
  depends_on_program_id: null,
  condition: {},
};

export default function AdminProgramDepsPage() {
  const qc = useQueryClient();
  const { data: deps, isLoading } = useDeps();
  const { data: programs } = useProgramOptions();
  const [editing, setEditing] = useState<Partial<DepRow> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const nameOf = (id: string | null) => programs?.find((p) => p.id === id)?.name_ru || id || '—';

  const saveMutation = useMutation({
    mutationFn: async (d: Partial<DepRow>) => {
      const payload: any = {
        program_id: d.program_id,
        depends_on_program_id: d.depends_on_program_id || null,
        condition: d.condition || {},
      };
      if (isNew) {
        const { error } = await supabase.from('finance_program_deps').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('finance_program_deps').update(payload).eq('id', d.id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-finance-deps'] });
      toast.success(isNew ? 'Зависимость создана' : 'Зависимость обновлена');
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('finance_program_deps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-finance-deps'] });
      toast.success('Зависимость удалена');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <AdminPageHeader title="Условия и зависимости" actions={
        <Button size="sm" onClick={() => { setIsNew(true); setEditing({ ...EMPTY_DEP }); }}>
          <Plus className="h-4 w-4 mr-1" /> Добавить
        </Button>
      } />

      <div className="rounded-lg border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Программа</TableHead>
              <TableHead className="w-10" />
              <TableHead>Зависит от</TableHead>
              <TableHead>Условие</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Загрузка…</TableCell></TableRow>
            )}
            {deps?.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Badge variant="outline">{nameOf(d.program_id)}</Badge>
                </TableCell>
                <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                <TableCell>
                  <Badge variant="secondary">{nameOf(d.depends_on_program_id)}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs max-w-[300px] truncate">
                  {JSON.stringify(d.condition)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setIsNew(false); setEditing({ ...d }); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive"
                      onClick={() => { if (confirm('Удалить?')) deleteMutation.mutate(d.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {deps?.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Нет зависимостей</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Новая зависимость' : 'Редактировать'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Программа</Label>
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={editing.program_id || ''}
                  onChange={(e) => setEditing({ ...editing, program_id: e.target.value })}>
                  <option value="">Выберите…</option>
                  {programs?.map((p) => <option key={p.id} value={p.id}>{p.name_ru} ({p.id})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Зависит от</Label>
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={editing.depends_on_program_id || ''}
                  onChange={(e) => setEditing({ ...editing, depends_on_program_id: e.target.value || null })}>
                  <option value="">Нет (базовая)</option>
                  {programs?.map((p) => <option key={p.id} value={p.id}>{p.name_ru} ({p.id})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Условие (JSON)</Label>
                <Textarea rows={4} className="font-mono text-xs"
                  value={JSON.stringify(editing.condition ?? {}, null, 2)}
                  onChange={(e) => {
                    try { setEditing({ ...editing, condition: JSON.parse(e.target.value) }); } catch {}
                  }}
                  placeholder='{"reason_ru": "Необходимо наличие инфраструктуры"}' />
              </div>
            </div>
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
