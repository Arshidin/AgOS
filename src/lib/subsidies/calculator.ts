import type { SubsidyRate, InvestmentItem } from '@/types/subsidy';

export function formatKzt(amount: number | null | undefined): string {
  if (amount == null) return '—';
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)} млрд ₸`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)} млн ₸`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(0)} тыс ₸`;
  return `${amount.toLocaleString('ru-RU')} ₸`;
}

/** Calculate reimbursement for a subsidy rate line × quantity. */
export function calcRateReimbursement(rate: SubsidyRate, qty: number, actualUnitCost?: number): number {
  if (qty <= 0) return 0;
  if (rate.rate_kzt != null) {
    const base = rate.rate_kzt * qty;
    if (rate.rate_cap_pct != null && actualUnitCost != null) {
      // If cap is set, amount cannot exceed cap% of actual cost
      const cap = (rate.rate_cap_pct / 100) * actualUnitCost * qty;
      return Math.min(base, cap);
    }
    return base;
  }
  if (rate.rate_cap_pct != null && actualUnitCost != null) {
    return (rate.rate_cap_pct / 100) * actualUnitCost * qty;
  }
  return 0;
}

/** Calculate irrigation reimbursement: min(actualCost, maxCost) × ratePct/100 × hectares. */
export function calcIrrigationReimbursement(
  maxCostPerHa: number,
  ratePct: number,
  hectares: number,
  actualCostPerHa?: number,
): number {
  if (hectares <= 0) return 0;
  const effectiveCost = actualCostPerHa != null ? Math.min(actualCostPerHa, maxCostPerHa) : maxCostPerHa;
  return (ratePct / 100) * effectiveCost * hectares;
}

/** Calculate reimbursement for an investment item (equipment). */
export function calcItemReimbursement(item: InvestmentItem, qty: number, actualUnitCost?: number): number {
  if (qty <= 0) return 0;
  const rate = (item.reimbursement_rate_pct ?? 0) / 100;
  const cost = actualUnitCost ?? item.max_cost_kzt ?? 0;
  return rate * cost * qty;
}
