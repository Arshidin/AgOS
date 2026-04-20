import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  editing: any;
  setEditing: (v: any) => void;
  isNew: boolean;
}

export default function ProgramBasicFields({ editing, setEditing, isNew }: Props) {
  const set = (field: string, value: any) => setEditing({ ...editing, [field]: value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>ID (slug)</Label>
          <Input value={editing.id || ''} disabled={!isNew} onChange={(e) => set('id', e.target.value)} placeholder="zhaylau" />
        </div>
        <div className="space-y-1">
          <Label>Порядок</Label>
          <Input type="number" value={editing.order_index ?? 0} onChange={(e) => set('order_index', Number(e.target.value))} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Название (RU)</Label>
          <Input value={editing.name_ru || ''} onChange={(e) => set('name_ru', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Название (KZ)</Label>
          <Input value={editing.name_kz || ''} onChange={(e) => set('name_kz', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Название (EN)</Label>
          <Input value={editing.name_en || ''} onChange={(e) => set('name_en', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Тип</Label>
          <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={editing.type || 'credit'} onChange={(e) => set('type', e.target.value)}>
            <option value="credit">Кредит</option>
            <option value="subsidy">Субсидия</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => set('is_active', v)} />
          <Label>Активна</Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Лимит мин (₸)</Label>
          <Input type="number" value={editing.limits_min ?? 0} onChange={(e) => set('limits_min', Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label>Лимит макс (₸)</Label>
          <Input type="number" value={editing.limits_max ?? 0} onChange={(e) => set('limits_max', Number(e.target.value))} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Описание (RU)</Label>
        <Textarea rows={2} value={editing.description_ru || ''} onChange={(e) => set('description_ru', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Описание (KZ)</Label>
        <Textarea rows={2} value={editing.description_kz || ''} onChange={(e) => set('description_kz', e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label>Роль в проекте (RU)</Label>
        <Textarea rows={2} value={editing.role_in_project_ru || ''} onChange={(e) => set('role_in_project_ru', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Когда применяется (RU)</Label>
        <Textarea rows={2} value={editing.when_used_ru || ''} onChange={(e) => set('when_used_ru', e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label>Правила допуска (JSON)</Label>
        <Textarea rows={3} className="font-mono text-xs"
          value={JSON.stringify(editing.eligibility_rules ?? [], null, 2)}
          onChange={(e) => { try { set('eligibility_rules', JSON.parse(e.target.value)); } catch {} }} />
      </div>
    </div>
  );
}
