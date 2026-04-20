import type {
  ProjectInputs,
  FinanceProgram,
  ProgramDependency,
  ComputedStage,
  UserSegment,
  EligibilityRule,
} from '@/types/finance';

/** Determine user segment from inputs */
export function determineSegment(inputs: ProjectInputs): UserSegment {
  const hasLivestock = inputs.herd_size > 0;
  const hasFarm = inputs.has_farm;
  const isAgri = inputs.is_agri_producer;

  if (!isAgri && !hasFarm && !hasLivestock) return 'investor';
  if (isAgri && !hasLivestock) return 'crop_farmer';
  if (hasLivestock && hasFarm) return 'livestock_farmer';
  return 'hybrid';
}

/** Check if a single rule passes */
function checkRule(rule: EligibilityRule, inputs: ProjectInputs): boolean {
  const val = (inputs as unknown as Record<string, unknown>)[rule.field];
  switch (rule.op) {
    case 'eq': return val === rule.value;
    case 'gt': return typeof val === 'number' && val > (rule.value as number);
    case 'lt': return typeof val === 'number' && val < (rule.value as number);
    case 'gte': return typeof val === 'number' && val >= (rule.value as number);
    case 'lte': return typeof val === 'number' && val <= (rule.value as number);
    default: return false;
  }
}

/** Check if a program is eligible given inputs */
function isProgramEligible(program: FinanceProgram, inputs: ProjectInputs): boolean {
  if (!program.eligibility_rules || program.eligibility_rules.length === 0) return true;
  return program.eligibility_rules.every((rule) => checkRule(rule, inputs));
}

/** Check if a dependency blocks a program */
function isDependencyMet(
  dep: ProgramDependency,
  inputs: ProjectInputs,
  eligibleIds: Set<string>,
): boolean {
  // If depends on another program, check that program is eligible
  if (dep.depends_on_program_id && !eligibleIds.has(dep.depends_on_program_id)) {
    return false;
  }
  // Check condition field
  if (dep.condition?.check_field) {
    const val = (inputs as unknown as Record<string, unknown>)[dep.condition.check_field];
    if (val === dep.condition.check_value) return false; // condition not met
  }
  return true;
}

/** Main engine: compute roadmap stages */
export function computeRoadmap(
  programs: FinanceProgram[],
  deps: ProgramDependency[],
  inputs: ProjectInputs,
  lang: string = 'ru',
): ComputedStage[] {
  // 1. Find all eligible programs
  const eligibleIds = new Set<string>();
  for (const p of programs) {
    if (isProgramEligible(p, inputs)) {
      eligibleIds.add(p.id);
    }
  }

  // 2. Build stages
  const stages: ComputedStage[] = [];
  const reasonKey = lang === 'kz' ? 'reason_kz' : 'reason_ru';

  for (const program of programs) {
    const eligible = eligibleIds.has(program.id);
    if (!eligible) continue; // Skip programs not relevant

    const programDeps = deps.filter((d) => d.program_id === program.id);
    let status: ComputedStage['status'] = 'available';
    let reason: string | undefined;

    for (const dep of programDeps) {
      if (!isDependencyMet(dep, inputs, eligibleIds)) {
        status = 'conditional';
        reason = dep.condition?.[reasonKey] || dep.condition?.reason_ru || undefined;
        break;
      }
    }

    stages.push({ program, status, reason, order: program.order_index });
  }

  // Sort by order
  stages.sort((a, b) => a.order - b.order);

  return stages;
}
