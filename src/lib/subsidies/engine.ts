import type {
  SubsidyProgram, SubsidyRate, SubsidyMatchInputs,
  MatchedRate, MatchedSubsidy, SubsidyEligibilityRule,
} from '@/types/subsidy';

function checkRule(rule: SubsidyEligibilityRule, inputs: SubsidyMatchInputs): boolean {
  const val = (inputs as unknown as Record<string, unknown>)[rule.field];
  switch (rule.op) {
    case 'eq':  return val === rule.value;
    case 'gt':  return typeof val === 'number' && val > (rule.value as number);
    case 'lt':  return typeof val === 'number' && val < (rule.value as number);
    case 'gte': return typeof val === 'number' && val >= (rule.value as number);
    case 'lte': return typeof val === 'number' && val <= (rule.value as number);
    case 'in':  return Array.isArray(rule.value) && (rule.value as unknown[]).includes(val);
    default:    return false;
  }
}

export function isProgramEligible(program: SubsidyProgram, inputs: SubsidyMatchInputs): boolean {
  if (!program.eligibility_rules?.length) return true;
  return program.eligibility_rules.every((rule) => checkRule(rule, inputs));
}

/** Category-level match heuristic — quick path when eligibility_rules are empty. */
function matchesCategory(program: SubsidyProgram, inputs: SubsidyMatchInputs): boolean {
  switch (program.category) {
    case 'livestock':
      return inputs.has_livestock_breeding || inputs.has_dairy || inputs.has_meat || inputs.has_wool_honey;
    case 'crop':
      return inputs.has_crop;
    case 'investment':
      return inputs.needs_investment;
    case 'irrigation':
      return inputs.needs_irrigation;
    default:
      return false;
  }
}

/** Match a rate against inputs using its filters JSON (best-effort). */
function rateMatchesInputs(rate: SubsidyRate, inputs: SubsidyMatchInputs): boolean {
  const f = rate.filters || {};
  if (f.livestock_type && inputs.livestock_type && f.livestock_type !== inputs.livestock_type) return false;
  if (f.origin && inputs.livestock_origin && f.origin !== inputs.livestock_origin) return false;
  if (f.equipment_type && inputs.irrigation_equipment && f.equipment_type !== inputs.irrigation_equipment) return false;
  return true;
}

function estimateQty(rate: SubsidyRate, inputs: SubsidyMatchInputs): number {
  const unit = (rate.unit || '').toLowerCase();
  if (unit.includes('голов')) return inputs.herd_size || 0;
  if (unit === 'гектар') return inputs.irrigated_area || 0;
  if (unit.includes('га')) return inputs.land_area || 0;
  return 0;
}

/** Compute monetary amount for a rate × qty. Cap at rate_cap_pct of implicit cost when cap present. */
function computeAmount(rate: SubsidyRate, qty: number): number {
  if (!qty) return 0;
  if (rate.rate_kzt) return rate.rate_kzt * qty;
  return 0;
}

export function matchSubsidies(
  programs: SubsidyProgram[],
  rates: SubsidyRate[],
  inputs: SubsidyMatchInputs,
): MatchedSubsidy[] {
  const byProgram = new Map<string, SubsidyRate[]>();
  for (const r of rates) {
    if (!byProgram.has(r.subsidy_id)) byProgram.set(r.subsidy_id, []);
    byProgram.get(r.subsidy_id)!.push(r);
  }

  const results: MatchedSubsidy[] = [];

  for (const program of programs) {
    // Eligibility check — explicit rules first, otherwise category heuristic
    const explicitEligible = program.eligibility_rules?.length
      ? isProgramEligible(program, inputs)
      : matchesCategory(program, inputs);
    if (!explicitEligible) continue;

    const progRates = (byProgram.get(program.id) || []).filter((r) => rateMatchesInputs(r, inputs));
    const matched: MatchedRate[] = [];

    for (const rate of progRates) {
      const qty = estimateQty(rate, inputs);
      if (qty <= 0) continue;
      const amount = computeAmount(rate, qty);
      if (amount <= 0) continue;
      matched.push({
        rate_id: rate.id,
        rate_name: rate.name_ru,
        qty,
        unit: rate.unit || '',
        amount_kzt: amount,
      });
    }

    const total = matched.reduce((s, m) => s + m.amount_kzt, 0);
    // Include the program even if no rate amount yet (info-only card)
    if (matched.length > 0 || progRates.length === 0) {
      results.push({
        subsidy: program,
        matched_rates: matched,
        total_amount_kzt: total,
      });
    }
  }

  // Sort: programs with amount first, then by category priority
  const catOrder: Record<string, number> = { livestock: 1, investment: 2, crop: 3, irrigation: 4 };
  results.sort((a, b) => {
    if ((b.total_amount_kzt > 0 ? 1 : 0) !== (a.total_amount_kzt > 0 ? 1 : 0)) {
      return (b.total_amount_kzt > 0 ? 1 : 0) - (a.total_amount_kzt > 0 ? 1 : 0);
    }
    if (a.subsidy.category !== b.subsidy.category) {
      return (catOrder[a.subsidy.category] ?? 9) - (catOrder[b.subsidy.category] ?? 9);
    }
    return a.subsidy.order_index - b.subsidy.order_index;
  });

  return results;
}
