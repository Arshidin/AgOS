import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface WizardRule {
  id: string;
  program_id: string;
  field: string;
  op: string;
  value: unknown;
  label_ru: string;
  label_kz: string;
  order_index: number;
}

const FIELDS = [
  'is_agri_producer', 'has_farm', 'has_feed_base', 'need_infrastructure',
  'import_livestock', 'herd_size', 'target_herd_size', 'land_area', 'goal_type',
];
const OPS = ['eq', 'gt', 'gte', 'lt', 'lte'];

export default function ProgramWizardRules({ programId }: { programId: string }) {
  const qc = useQueryClient();
  const { data: rules, isLoading } = useQuery({
    queryKey: ['admin-wizard-rules', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_wizard_rules' as any)
        .select('*')
        .eq('program_id', programId)
        .order('order_index');
      if (error) throw error;
      return data as any as WizardRule[];
    },
  });

  const [draft, setDraft] = useState<Partial<WizardRule>>({
    field: 'is_agri_producer', op: 'eq', value: true, label_ru: '', label_kz: '', order_index: 0,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('finance_wizard_rules' as any).insert({
        program_id: programId,
        field: draft.field,
        op: draft.op,
        value: draft.value,
        label_ru: draft.label_ru,
        label_kz: draft.label_kz || '',
        order_index: draft.order_index ?? (rules?.length ?? 0),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-wizard-rules', programId] });
      toast.success('Правило добавлено');
      setDraft({ field: 'is_agri_producer', op: 'eq', value: true, label_ru: '', label_kz: '', order_index: (rules?.length ?? 0) + 1 });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('finance_wizard_rules' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-wizard-rules', programId] });
      toast.success('Удалено');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const formatValue = (v: unknown) => {
    if (typeof v === 'boolean') return v ? '✓' : '✗';
    return String(v);
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : (
        <div className="rounded border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Поле</TableHead>
                <TableHead className="w-16">Op</TableHead>
                <TableHead className="w-20">Знач.</TableHead>
                <TableHead>Метка (RU)</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{r.order_index}</TableCell>
                  <TableCell className="font-mono text-xs">{r.field}</TableCell>
                  <TableCell className="text-xs">{r.op}</TableCell>
                  <TableCell className="text-xs">{formatValue(r.value)}</TableCell>
                  <TableCell className="text-sm">{r.label_ru}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="text-destructive h-7 w-7"
                      onClick={() => deleteMutation.mutate(r.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!rules || rules.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">Нет правил</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="border border-dashed border-border rounded-lg p-3 space-y-3">
        <p className="text-sm font-medium">Добавить правило</p>
        <div className="grid grid-cols-5 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Поле</Label>
            <select className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              value={draft.field} onChange={(e) => setDraft({ ...draft, field: e.target.value })}>
              {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Операция</Label>
            <select className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              value={draft.op} onChange={(e) => setDraft({ ...draft, op: e.target.value })}>
              {OPS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Значение</Label>
            <Input className="text-xs h-8" value={String(draft.value ?? '')}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'true') setDraft({ ...draft, value: true });
                else if (v === 'false') setDraft({ ...draft, value: false });
                else if (!isNaN(Number(v)) && v !== '') setDraft({ ...draft, value: Number(v) });
                else setDraft({ ...draft, value: v });
              }} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Порядок</Label>
            <Input type="number" className="text-xs h-8" value={draft.order_index ?? 0}
              onChange={(e) => setDraft({ ...draft, order_index: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">&nbsp;</Label>
            <Button size="sm" className="w-full h-8" onClick={() => addMutation.mutate()} disabled={!draft.label_ru || addMutation.isPending}>
              <Plus className="h-3 w-3 mr-1" /> Добавить
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Метка (RU)</Label>
            <Input className="text-xs h-8" value={draft.label_ru || ''} placeholder="Вы — СХТП"
              onChange={(e) => setDraft({ ...draft, label_ru: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Метка (KZ)</Label>
            <Input className="text-xs h-8" value={draft.label_kz || ''} placeholder="Сіз — АШӨЖ"
              onChange={(e) => setDraft({ ...draft, label_kz: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
}
