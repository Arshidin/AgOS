import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/ui/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { InvestmentPassport, InvestmentItem } from '@/types/subsidy';
import { formatKzt } from '@/lib/subsidies/calculator';

export default function AdminPassportsPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingPassport, setEditingPassport] = useState<Partial<InvestmentPassport> | null>(null);
  const [editingItem, setEditingItem] = useState<(Partial<InvestmentItem> & { passport_id?: string }) | null>(null);

  const { data: passports } = useQuery({
    queryKey: ['admin-passports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subsidy_investment_passports' as any)
        .select('*')
        .order('passport_number');
      if (error) throw error;
      return data as unknown as InvestmentPassport[];
    },
  });

  const { data: items } = useQuery({
    queryKey: ['admin-items', expanded],
    queryFn: async () => {
      if (!expanded) return [];
      const { data, error } = await supabase
        .from('subsidy_investment_items' as any)
        .select('*')
        .eq('passport_id', expanded)
        .order('order_index');
      if (error) throw error;
      return data as unknown as InvestmentItem[];
    },
    enabled: !!expanded,
  });

  const savePassport = useMutation({
    mutationFn: async (p: Partial<InvestmentPassport>) => {
      const { error } = await supabase.from('subsidy_investment_passports' as any).upsert(p as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-passports'] }); setEditingPassport(null); toast.success('Сохранено'); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveItem = useMutation({
    mutationFn: async (i: Partial<InvestmentItem>) => {
      if (i.id) {
        const { error } = await supabase.from('subsidy_investment_items' as any).update(i as any).eq('id', i.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subsidy_investment_items' as any).insert(i as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-items'] }); setEditingItem(null); toast.success('Позиция сохранена'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subsidy_investment_items' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-items'] }); toast.success('Позиция удалена'); },
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <AdminPageHeader title="Паспорта инвестсубсидий" actions={
        <Button size="sm" onClick={() => setEditingPassport({ passport_number: (passports?.length ?? 0) + 1, subsidy_id: 'investment_317', order_index: 0, default_rate_pct: 50 })}>
          <Plus className="h-4 w-4 mr-1" /> Паспорт
        </Button>
      } />

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>№</TableHead>
              <TableHead>Название</TableHead>
              <TableHead className="w-32">Ставка</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {passports?.map((p) => (
              <>
                <TableRow key={p.id}>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                      {expanded === p.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell className="font-mono">{p.passport_number}</TableCell>
                  <TableCell className="font-medium">{p.name_ru}</TableCell>
                  <TableCell>{p.default_rate_pct != null ? `${p.default_rate_pct}%` : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditingItem({ passport_id: p.id, unit: 'ед.', order_index: (items?.length ?? 0) + 1 })}>
                        <Plus className="h-3 w-3 mr-1" /> Позиция
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingPassport({ ...p })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expanded === p.id && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/30 p-0">
                      <div className="p-3 max-h-[600px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs uppercase text-muted-foreground">
                            <tr className="border-b">
                              <th className="text-left py-2 px-2">Код</th>
                              <th className="text-left py-2 px-2">Наименование</th>
                              <th className="py-2 px-2">Ед.</th>
                              <th className="text-right py-2 px-2">%</th>
                              <th className="text-right py-2 px-2">Макс.</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {(items ?? []).map((item) => (
                              <tr key={item.id} className="border-b last:border-0 hover:bg-background">
                                <td className="py-1.5 px-2 font-mono text-xs">{item.position_code || '—'}</td>
                                <td className="py-1.5 px-2">{item.name_ru}</td>
                                <td className="py-1.5 px-2">{item.unit}</td>
                                <td className="py-1.5 px-2 text-right">{item.reimbursement_rate_pct ?? '—'}%</td>
                                <td className="py-1.5 px-2 text-right">{item.max_cost_kzt != null ? formatKzt(item.max_cost_kzt) : '—'}</td>
                                <td className="py-1.5 px-2">
                                  <div className="flex gap-1 justify-end">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingItem({ ...item })}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                                      if (confirm('Удалить позицию?')) deleteItem.mutate(item.id);
                                    }}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {(items?.length ?? 0) === 0 && <tr><td colSpan={6} className="py-3 text-center text-muted-foreground">Нет позиций</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Passport dialog */}
      <Dialog open={!!editingPassport} onOpenChange={() => setEditingPassport(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Паспорт</DialogTitle></DialogHeader>
          {editingPassport && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>ID (slug)</Label><Input value={editingPassport.id || ''} onChange={(e) => setEditingPassport({ ...editingPassport, id: e.target.value })} /></div>
                <div><Label>№ паспорта</Label><Input type="number" value={editingPassport.passport_number ?? 0} onChange={(e) => setEditingPassport({ ...editingPassport, passport_number: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Название RU</Label><Input value={editingPassport.name_ru || ''} onChange={(e) => setEditingPassport({ ...editingPassport, name_ru: e.target.value })} /></div>
              <div><Label>Описание</Label><Textarea rows={2} value={editingPassport.description_ru || ''} onChange={(e) => setEditingPassport({ ...editingPassport, description_ru: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Базовый % возмещения</Label><Input type="number" value={editingPassport.default_rate_pct ?? ''} onChange={(e) => setEditingPassport({ ...editingPassport, default_rate_pct: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>ID субсидии</Label><Input value={editingPassport.subsidy_id || ''} onChange={(e) => setEditingPassport({ ...editingPassport, subsidy_id: e.target.value })} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPassport(null)}>Отмена</Button>
            <Button onClick={() => savePassport.mutate(editingPassport!)}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Позиция техники</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Код</Label><Input value={editingItem.position_code || ''} onChange={(e) => setEditingItem({ ...editingItem, position_code: e.target.value })} /></div>
                <div><Label>Единица</Label><Input value={editingItem.unit || 'ед.'} onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })} /></div>
                <div><Label>% возмещения</Label><Input type="number" value={editingItem.reimbursement_rate_pct ?? ''} onChange={(e) => setEditingItem({ ...editingItem, reimbursement_rate_pct: e.target.value ? Number(e.target.value) : null })} /></div>
              </div>
              <div><Label>Наименование</Label><Input value={editingItem.name_ru || ''} onChange={(e) => setEditingItem({ ...editingItem, name_ru: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Макс. стоимость ₸</Label><Input type="number" value={editingItem.max_cost_kzt ?? ''} onChange={(e) => setEditingItem({ ...editingItem, max_cost_kzt: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>Порог</Label><Input value={editingItem.min_threshold_ru || ''} onChange={(e) => setEditingItem({ ...editingItem, min_threshold_ru: e.target.value })} /></div>
              </div>
              <div><Label>Примечание</Label><Textarea rows={2} value={editingItem.note_ru || ''} onChange={(e) => setEditingItem({ ...editingItem, note_ru: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Отмена</Button>
            <Button onClick={() => saveItem.mutate(editingItem!)}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
