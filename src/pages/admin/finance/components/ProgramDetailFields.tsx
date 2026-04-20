import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  editing: any;
  setEditing: (v: any) => void;
  section: 'hero' | 'content' | 'calc';
}

function JsonListEditor({ label, value, onChange, itemFields }: {
  label: string;
  value: any[];
  onChange: (v: any[]) => void;
  itemFields: { key: string; label: string; type?: string }[];
}) {
  const items = Array.isArray(value) ? value : [];
  const add = () => {
    const empty: any = {};
    itemFields.forEach(f => { empty[f.key] = ''; });
    onChange([...items, empty]);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, key: string, val: any) => {
    const copy = [...items];
    copy[i] = { ...copy[i], [key]: val };
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Button size="sm" variant="outline" onClick={add}><Plus className="h-3 w-3 mr-1" /> Добавить</Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start p-2 rounded border border-border bg-muted/30">
          <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${itemFields.length}, 1fr)` }}>
            {itemFields.map(f => (
              <Input key={f.key} placeholder={f.label} value={item[f.key] ?? ''}
                type={f.type || 'text'}
                onChange={(e) => update(i, f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)} />
            ))}
          </div>
          <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => remove(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-muted-foreground">Нет элементов</p>}
    </div>
  );
}

function StringListEditor({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const items = Array.isArray(value) ? value : [];
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Textarea rows={3} className="font-mono text-xs" placeholder="Каждая строка — элемент"
        value={items.join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n').filter(Boolean))} />
    </div>
  );
}

export default function ProgramDetailFields({ editing, setEditing, section }: Props) {
  const set = (field: string, value: any) => setEditing({ ...editing, [field]: value });

  if (section === 'hero') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Провайдер</Label>
            <Input value={editing.provider || ''} onChange={(e) => set('provider', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Провайдер (кратко)</Label>
            <Input value={editing.provider_short || ''} onChange={(e) => set('provider_short', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Hero заголовок</Label>
          <Input value={editing.hero_title || ''} onChange={(e) => set('hero_title', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Hero описание</Label>
          <Textarea rows={2} value={editing.hero_desc || ''} onChange={(e) => set('hero_desc', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Hero цвет (hex)</Label>
          <div className="flex gap-2 items-center">
            <Input value={editing.hero_color || '#1a3d22'} onChange={(e) => set('hero_color', e.target.value)} className="flex-1" />
            <div className="w-8 h-8 rounded border" style={{ backgroundColor: editing.hero_color || '#1a3d22' }} />
          </div>
        </div>

        <JsonListEditor label="Hero бейджи" value={editing.hero_badges ?? []} onChange={(v) => set('hero_badges', v)}
          itemFields={[{ key: 'text', label: 'Текст' }, { key: 'style', label: 'Стиль (green/yellow/white)' }]} />

        <JsonListEditor label="Ключевые параметры" value={editing.key_params ?? []} onChange={(v) => set('key_params', v)}
          itemFields={[
            { key: 'label', label: 'Метка' },
            { key: 'value', label: 'Значение' },
            { key: 'sub', label: 'Подпись' },
            { key: 'color', label: 'Цвет (green/yellow)' },
          ]} />

        <div className="space-y-1">
          <Label>Info уведомление</Label>
          <Textarea rows={2} value={editing.info_notice || ''} onChange={(e) => set('info_notice', e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Похожие программы (ID через запятую)</Label>
          <Input value={(editing.similar_program_ids ?? []).join(', ')}
            onChange={(e) => set('similar_program_ids', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
        </div>
      </div>
    );
  }

  if (section === 'content') {
    return (
      <div className="space-y-4">
        <StringListEditor label="Для кого подходит" value={editing.eligible_items ?? []} onChange={(v) => set('eligible_items', v)} />
        <StringListEditor label="Не подходит если" value={editing.not_eligible_items ?? []} onChange={(v) => set('not_eligible_items', v)} />
        <StringListEditor label="Что покрывается" value={editing.covered_items ?? []} onChange={(v) => set('covered_items', v)} />
        <StringListEditor label="Что НЕ покрывается" value={editing.not_covered_items ?? []} onChange={(v) => set('not_covered_items', v)} />

        <JsonListEditor label="Таблица условий" value={editing.conditions_table ?? []} onChange={(v) => set('conditions_table', v)}
          itemFields={[{ key: '0', label: 'Параметр' }, { key: '1', label: 'Значение' }]} />

        <JsonListEditor label="Документы" value={editing.documents_list ?? []} onChange={(v) => set('documents_list', v)}
          itemFields={[{ key: 'name', label: 'Название' }, { key: 'required', label: 'Обязателен (true/false)' }]} />

        <JsonListEditor label="Шаги получения" value={editing.steps_list ?? []} onChange={(v) => set('steps_list', v)}
          itemFields={[{ key: 'title', label: 'Заголовок' }, { key: 'desc', label: 'Описание' }, { key: 'time', label: 'Срок' }]} />

        <JsonListEditor label="FAQ" value={editing.faq_list ?? []} onChange={(v) => set('faq_list', v)}
          itemFields={[{ key: 'q', label: 'Вопрос' }, { key: 'a', label: 'Ответ' }]} />
      </div>
    );
  }

  // section === 'calc'
  const calc = editing.calc_defaults && typeof editing.calc_defaults === 'object' ? editing.calc_defaults : {};
  const setCalc = (key: string, val: number) => set('calc_defaults', { ...calc, [key]: val });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Параметры кредитного калькулятора (для типа «Кредит»)</p>
      <div className="grid grid-cols-3 gap-4">
        {[
          ['minAmount', 'Мин. сумма (млн ₸)'], ['maxAmount', 'Макс. сумма (млн ₸)'], ['defaultAmount', 'По умолч. (млн ₸)'],
          ['minTerm', 'Мин. срок (лет)'], ['maxTerm', 'Макс. срок (лет)'], ['defaultTerm', 'По умолч. (лет)'],
          ['minRate', 'Мин. ставка (%)'], ['maxRate', 'Макс. ставка (%)'], ['defaultRate', 'По умолч. (%)'],
        ].map(([key, label]) => (
          <div key={key as string} className="space-y-1">
            <Label className="text-xs">{label as string}</Label>
            <Input type="number" value={calc[key as string] ?? 0} onChange={(e) => setCalc(key as string, Number(e.target.value))} />
          </div>
        ))}
      </div>
    </div>
  );
}
