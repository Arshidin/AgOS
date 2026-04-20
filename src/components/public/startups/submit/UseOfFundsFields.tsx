import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { SubmitUseOfFunds } from '@/types/startup';
import AiBadge from './AiBadge';

interface Props {
  items: SubmitUseOfFunds[];
  onChange: (items: SubmitUseOfFunds[]) => void;
  aiFilledCount: number;
}

export default function UseOfFundsFields({ items, onChange, aiFilledCount }: Props) {
  const { t } = useTranslation();

  const addItem = () => {
    onChange([...items, { item: '', percentage: 0 }]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof SubmitUseOfFunds, value: string | number) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx]!, [field]: value } as SubmitUseOfFunds;
    onChange(updated);
  };

  const total = items.reduce((sum, i) => sum + (i.percentage || 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium" style={{ color: '#2B180A' }}>
          {t('startups.submit.useOfFunds')}
        </label>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-lg hover:bg-black/5 transition-colors"
          style={{ color: '#E8730C' }}
        >
          <Plus size={14} />
          {t('startups.submit.addItem')}
        </button>
      </div>

      {items.map((fund, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'rgba(43,24,10,0.02)', border: '1px solid rgba(43,24,10,0.06)' }}
        >
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={fund.item}
              onChange={(e) => updateItem(idx, 'item', e.target.value)}
              placeholder={t('startups.submit.fundItem')}
              className="h-9 rounded-lg border-none text-[13px] flex-1"
              style={{ background: 'rgba(43,24,10,0.04)' }}
            />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={fund.percentage || ''}
                onChange={(e) => updateItem(idx, 'percentage', parseInt(e.target.value) || 0)}
                className="h-9 w-16 rounded-lg border-none text-[13px] text-center"
                style={{ background: 'rgba(43,24,10,0.04)' }}
              />
              <span className="text-[13px]" style={{ color: 'rgba(43,24,10,0.4)' }}>%</span>
            </div>
            {idx < aiFilledCount && <AiBadge />}
          </div>
          <button
            type="button"
            onClick={() => removeItem(idx)}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
          >
            <Trash2 size={14} style={{ color: 'rgba(43,24,10,0.3)' }} />
          </button>
        </div>
      ))}

      {items.length > 0 && (
        <p
          className="text-[11px] text-right"
          style={{ color: total === 100 ? '#5A8A5A' : 'rgba(43,24,10,0.4)' }}
        >
          {t('startups.submit.totalPercent', { total })}
        </p>
      )}
    </div>
  );
}
