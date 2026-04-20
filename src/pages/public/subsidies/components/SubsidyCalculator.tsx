import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SubsidyRate } from '@/types/subsidy';
import type { SubsidyCategory } from '@/types/subsidy';
import { calcRateReimbursement, calcIrrigationReimbursement, formatKzt } from '@/lib/subsidies/calculator';
import { Calculator, Info } from 'lucide-react';

interface Props {
  rates: SubsidyRate[];
  category?: SubsidyCategory;
}

export default function SubsidyCalculator({ rates, category }: Props) {
  const { t } = useTranslation();
  const [rateId, setRateId] = useState(rates[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [actualCost, setActualCost] = useState<number | null>(null);

  const selected = useMemo(() => rates.find((r) => r.id === rateId), [rates, rateId]);

  const isIrrigation = category === 'irrigation';
  const isCrop = category === 'crop';

  const amount = useMemo(() => {
    if (!selected) return 0;
    if (isIrrigation && selected.rate_kzt != null && selected.rate_cap_pct != null) {
      // Irrigation: rate_kzt is already maxCost × 50%, but we use the raw formula for clarity
      // rate_kzt = maxCostPerHa * 0.5, rate_cap_pct = 50
      const maxCostPerHa = selected.rate_kzt / (selected.rate_cap_pct / 100);
      return calcIrrigationReimbursement(maxCostPerHa, selected.rate_cap_pct, qty, actualCost ?? undefined);
    }
    return calcRateReimbursement(selected, qty, actualCost ?? undefined);
  }, [selected, qty, actualCost, isIrrigation]);

  if (!rates.length) return null;

  return (
    <div className="bg-gradient-to-br from-[#E8730C]/5 to-[#2B180A]/5 rounded-2xl p-4 md:p-6 border border-[#E8730C]/20">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <Calculator className="w-4 h-4 md:w-5 md:h-5 text-[#E8730C]" />
        <h3 className="font-serif text-base md:text-lg font-bold text-[#2B180A]">
          {t('subsidies.detail.calculator')}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 md:mb-4">
        <div>
          <Label className="text-xs text-[#2B180A]/70">{t('subsidies.detail.calcSelectRate')}</Label>
          <select
            value={rateId}
            onChange={(e) => setRateId(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-md border border-[#2B180A]/15 bg-white text-sm focus:outline-none focus:border-[#E8730C]"
          >
            {rates.map((r) => (
              <option key={r.id} value={r.id}>{r.name_ru}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs text-[#2B180A]/70">
            {t('subsidies.detail.calcQty')}{selected?.unit ? ` (${selected.unit})` : ''}
          </Label>
          <Input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1"
          />
        </div>
      </div>

      {/* Actual cost input for irrigation and investment modes */}
      {(isIrrigation || (selected?.rate_cap_pct != null)) && (
        <div className="mb-4">
          <Label className="text-xs text-[#2B180A]/70">
            {t('subsidies.detail.calcActualCost')}
          </Label>
          <Input
            type="number"
            min={0}
            placeholder={t('subsidies.detail.calcActualCostHint')}
            value={actualCost ?? ''}
            onChange={(e) => {
              const v = Number(e.target.value);
              setActualCost(v > 0 ? v : null);
            }}
            className="mt-1"
          />
        </div>
      )}

      {/* Crop notice: МИО sets rates annually */}
      {isCrop && selected && selected.rate_kzt == null && (
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">{t('subsidies.detail.calcCropNotice')}</p>
        </div>
      )}

      <div className="border-t border-[#2B180A]/10 pt-3 flex items-baseline justify-between">
        <span className="text-sm text-[#2B180A]/70">{t('subsidies.detail.calcAmount')}:</span>
        <span className="font-serif text-2xl font-bold text-[#E8730C]">
          {formatKzt(amount)}
        </span>
      </div>
      {selected?.rate_kzt ? (
        <p className="text-xs text-[#2B180A]/50 mt-2">
          {formatKzt(selected.rate_kzt)} × {qty} {selected.unit || ''}
          {selected.rate_cap_pct ? ` (≤${selected.rate_cap_pct}%)` : ''}
        </p>
      ) : null}
    </div>
  );
}
