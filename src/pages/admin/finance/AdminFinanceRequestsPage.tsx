import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader } from '@/components/admin/ui/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Eye, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ConsultRequest {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  status: string;
  how_heard: string | null;
  farm_name: string | null; // used as "message" for consultations
  created_at: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
}

function useConsultRequests() {
  return useQuery({
    queryKey: ['admin-finance-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registration_applications')
        .select('*')
        .eq('role', 'consultation')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ConsultRequest[];
    },
  });
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Новая', variant: 'default', icon: Clock },
  approved: { label: 'Обработана', variant: 'secondary', icon: CheckCircle2 },
  rejected: { label: 'Отклонена', variant: 'destructive', icon: XCircle },
};

function extractProgram(howHeard: string | null): string {
  if (!howHeard) return '—';
  const match = howHeard.match(/^finance_program:(.+)$/);
  return match ? (match[1] ?? howHeard) : howHeard;
}

export default function AdminFinanceRequestsPage() {
  const qc = useQueryClient();
  const { data: requests, isLoading } = useConsultRequests();
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<ConsultRequest | null>(null);
  const [note, setNote] = useState('');

  const filtered = requests?.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.full_name.toLowerCase().includes(s) ||
      r.phone.includes(s) ||
      (r.how_heard || '').toLowerCase().includes(s);
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const { error } = await supabase
        .from('registration_applications')
        .update({
          status,
          rejection_reason: rejection_reason || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-finance-requests'] });
      toast.success('Статус обновлён');
      setViewing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('registration_applications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-finance-requests'] });
      toast.success('Заявка удалена');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const counts = {
    total: requests?.length ?? 0,
    pending: requests?.filter((r) => r.status === 'pending').length ?? 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <AdminPageHeader
        title="Заявки на консультацию"
        badge={{ count: counts.pending, label: 'новых' }}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск по имени, телефону, программе…"
            className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Имя</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Программа</TableHead>
              <TableHead>Сообщение</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Загрузка…</TableCell></TableRow>
            )}
            {filtered?.map((r) => {
              const sc = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending!;
              const Icon = sc.icon;
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(r.created_at), 'dd.MM.yy HH:mm')}
                  </TableCell>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{extractProgram(r.how_heard)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {r.farm_name || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sc.variant} className="gap-1">
                      <Icon className="h-3 w-3" /> {sc.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setViewing(r); setNote(r.rejection_reason || ''); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive"
                        onClick={() => { if (confirm('Удалить заявку?')) deleteMutation.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered?.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Нет заявок</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Заявка на консультацию</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Имя:</span> {viewing.full_name}</div>
                <div><span className="text-muted-foreground">Телефон:</span> {viewing.phone}</div>
                <div><span className="text-muted-foreground">Программа:</span> {extractProgram(viewing.how_heard)}</div>
                <div><span className="text-muted-foreground">Дата:</span> {format(new Date(viewing.created_at), 'dd.MM.yyyy HH:mm')}</div>
              </div>
              {viewing.farm_name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Сообщение:</span>
                  <p className="mt-1 p-2 rounded bg-muted/50 border border-border">{viewing.farm_name}</p>
                </div>
              )}
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Заметка:</span>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Комментарий…" />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="text-destructive border-destructive/30"
              onClick={() => updateStatus.mutate({ id: viewing!.id, status: 'rejected', rejection_reason: note })}
              disabled={updateStatus.isPending}>
              <XCircle className="h-4 w-4 mr-1" /> Отклонить
            </Button>
            <Button
              onClick={() => updateStatus.mutate({ id: viewing!.id, status: 'approved', rejection_reason: note })}
              disabled={updateStatus.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Обработана
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
