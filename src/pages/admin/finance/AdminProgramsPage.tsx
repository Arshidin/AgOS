import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/ui/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, GripVertical } from 'lucide-react';
import ProgramBasicFields from './components/ProgramBasicFields';
import ProgramDetailFields from './components/ProgramDetailFields';
import ProgramWizardRules from './components/ProgramWizardRules';

type ProgramRow = any;

function usePrograms() {
  return useQuery({
    queryKey: ['admin-finance-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_programs')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data as ProgramRow[];
    },
  });
}

const EMPTY: Partial<ProgramRow> = {
  id: '', name_ru: '', name_kz: '', name_en: '', type: 'credit',
  description_ru: '', description_kz: '', description_en: '',
  role_in_project_ru: '', role_in_project_kz: '',
  when_used_ru: '', when_used_kz: '',
  financing_scope_ru: '', financing_scope_kz: '',
  limits_min: 0, limits_max: 0, order_index: 0, is_active: true,
  eligibility_rules: [], restrictions: [],
  provider: '', provider_short: '', hero_title: '', hero_desc: '', hero_color: '#1a3d22',
  hero_badges: [], key_params: [], calc_defaults: {},
  info_notice: '', eligible_items: [], not_eligible_items: [],
  covered_items: [], not_covered_items: [],
  conditions_table: [], documents_list: [], steps_list: [], faq_list: [], similar_program_ids: [],
};

export default function AdminProgramsPage() {
  const qc = useQueryClient();
  const { data: programs, isLoading } = usePrograms();
  const [editing, setEditing] = useState<Partial<ProgramRow> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [wizardProgramId, setWizardProgramId] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (p: Partial<ProgramRow>) => {
      if (isNew) {
        const { error } = await supabase.from('finance_programs').insert(p as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('finance_programs').update(p as any).eq('id', p.id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-finance-programs'] });
      toast.success(isNew ? 'Программа создана' : 'Программа обновлена');
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('finance_programs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-finance-programs'] });
      toast.success('Программа удалена');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fmtLimit = (v: number) => {
    if (!v) return '—';
    if (v >= 1e9) return `${(v / 1e9).toFixed(0)} млрд`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(0)} млн`;
    return v.toLocaleString('ru-RU');
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <AdminPageHeader title="Финансовые программы" actions={
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
              <TableHead>Тип</TableHead>
              <TableHead>Лимиты</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Загрузка…</TableCell></TableRow>
            )}
            {programs?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-muted-foreground"><GripVertical className="h-4 w-4 inline" /> {p.order_index}</TableCell>
                <TableCell className="font-mono text-xs">{p.id}</TableCell>
                <TableCell className="font-medium">{p.name_ru}</TableCell>
                <TableCell>
                  <Badge variant={p.type === 'credit' ? 'default' : 'secondary'}>
                    {p.type === 'credit' ? 'Кредит' : 'Субсидия'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{fmtLimit(p.limits_min)} – {fmtLimit(p.limits_max)} ₸</TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? 'default' : 'outline'} className={p.is_active ? 'bg-emerald-600' : ''}>
                    {p.is_active ? 'Активна' : 'Неактивна'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setIsNew(false); setEditing({ ...p }); }} title="Редактировать">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setWizardProgramId(p.id)} title="Wizard правила">
                      🧙
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                      if (confirm(`Удалить программу «${p.name_ru}»?`)) deleteMutation.mutate(p.id);
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

      {/* Edit / Create dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Новая программа' : `Редактировать: ${editing?.name_ru || ''}`}</DialogTitle>
          </DialogHeader>
          {editing && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="basic">Основное</TabsTrigger>
                <TabsTrigger value="hero">Hero & Параметры</TabsTrigger>
                <TabsTrigger value="content">Контент</TabsTrigger>
                <TabsTrigger value="calc">Калькулятор</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <ProgramBasicFields editing={editing} setEditing={setEditing} isNew={isNew} />
              </TabsContent>

              <TabsContent value="hero">
                <ProgramDetailFields editing={editing} setEditing={setEditing} section="hero" />
              </TabsContent>

              <TabsContent value="content">
                <ProgramDetailFields editing={editing} setEditing={setEditing} section="content" />
              </TabsContent>

              <TabsContent value="calc">
                <ProgramDetailFields editing={editing} setEditing={setEditing} section="calc" />
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

      {/* Wizard rules dialog */}
      <Dialog open={!!wizardProgramId} onOpenChange={() => setWizardProgramId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wizard правила: {programs?.find(p => p.id === wizardProgramId)?.name_ru}</DialogTitle>
          </DialogHeader>
          {wizardProgramId && <ProgramWizardRules programId={wizardProgramId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
