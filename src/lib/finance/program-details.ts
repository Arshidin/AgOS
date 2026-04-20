/**
 * Program details utilities — now reads from DB columns on finance_programs.
 * Wizard rules come from finance_wizard_rules table.
 * Falls back to empty defaults if DB fields are not populated.
 */

import type { ProjectInputs } from '@/types/finance';

export interface ProgramDetail {
  provider: string;
  providerShort: string;
  heroTitle: string;
  heroDesc: string;
  heroColor: string;
  heroBadges: { text: string; style: 'green' | 'yellow' | 'white' }[];
  keyParams: { label: string; value: string; sub: string; color?: 'green' | 'yellow' }[];
  calc: { minAmount: number; maxAmount: number; defaultAmount: number; minTerm: number; maxTerm: number; defaultTerm: number; minRate: number; maxRate: number; defaultRate: number };
  infoNotice: string;
  eligibleItems: string[];
  notEligibleItems: string[];
  coveredItems: string[];
  notCoveredItems: string[];
  conditions: [string, string][];
  documents: { name: string; required: boolean }[];
  steps: { title: string; desc: string; time: string }[];
  faq: { q: string; a: string }[];
  similarIds: string[];
}

export interface WizardRule {
  id: string;
  program_id: string;
  field: string;
  op: string;
  value: unknown;
  label_ru: string;
  label_kz: string;
  order_index: number;
}

/** Build ProgramDetail from DB row */
export function buildDetailFromRow(row: any): ProgramDetail {
  return {
    provider: row.provider || '',
    providerShort: row.provider_short || '',
    heroTitle: row.hero_title || row.name_ru || '',
    heroDesc: row.hero_desc || row.description_ru || '',
    heroColor: row.hero_color || '#1a3d22',
    heroBadges: Array.isArray(row.hero_badges) ? row.hero_badges : [],
    keyParams: Array.isArray(row.key_params) ? row.key_params : [],
    calc: row.calc_defaults && typeof row.calc_defaults === 'object' ? row.calc_defaults : { minAmount: 5, maxAmount: 500, defaultAmount: 20, minTerm: 1, maxTerm: 7, defaultTerm: 5, minRate: 4, maxRate: 16, defaultRate: 7 },
    infoNotice: row.info_notice || '',
    eligibleItems: Array.isArray(row.eligible_items) ? row.eligible_items : [],
    notEligibleItems: Array.isArray(row.not_eligible_items) ? row.not_eligible_items : [],
    coveredItems: Array.isArray(row.covered_items) ? row.covered_items : [],
    notCoveredItems: Array.isArray(row.not_covered_items) ? row.not_covered_items : [],
    conditions: Array.isArray(row.conditions_table) ? row.conditions_table : [],
    documents: Array.isArray(row.documents_list) ? row.documents_list : [],
    steps: Array.isArray(row.steps_list) ? row.steps_list : [],
    faq: Array.isArray(row.faq_list) ? row.faq_list : [],
    similarIds: Array.isArray(row.similar_program_ids) ? row.similar_program_ids : [],
  };
}

/** Evaluate a single wizard rule against user inputs */
function evaluateRule(rule: WizardRule, inputs: ProjectInputs): boolean {
  const fieldVal = (inputs as any)[rule.field];
  const expected = rule.value;
  switch (rule.op) {
    case 'eq': return fieldVal === expected || String(fieldVal) === String(expected);
    case 'gt': return Number(fieldVal) > Number(expected);
    case 'gte': return Number(fieldVal) >= Number(expected);
    case 'lt': return Number(fieldVal) < Number(expected);
    case 'lte': return Number(fieldVal) <= Number(expected);
    default: return fieldVal === expected;
  }
}

/** Compute wizard score from DB rules */
export function computeWizardScoreFromRules(
  rules: WizardRule[],
  inputs: ProjectInputs
): { passed: boolean[]; score: number; total: number; verdict: 'fit' | 'partial' | 'no_fit'; labels: string[] } {
  if (rules.length === 0) return { passed: [], score: 0, total: 0, verdict: 'fit', labels: [] };
  const sorted = [...rules].sort((a, b) => a.order_index - b.order_index);
  const passed = sorted.map(r => evaluateRule(r, inputs));
  const labels = sorted.map(r => r.label_ru);
  const score = passed.filter(Boolean).length;
  const total = sorted.length;
  const ratio = score / total;
  const verdict = ratio >= 0.8 ? 'fit' : ratio >= 0.5 ? 'partial' : 'no_fit';
  return { passed, score, total, verdict, labels };
}
