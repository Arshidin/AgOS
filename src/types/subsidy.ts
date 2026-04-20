// Domain types for subsidies module (МСХ РК)

export type SubsidyCategory = 'livestock' | 'crop' | 'investment' | 'irrigation';

export interface SubsidyDocument {
  name: string;
  required: boolean;
}

export interface SubsidyStep {
  title: string;
  desc: string;
  time: string;
}

export interface SubsidyFaq {
  q: string;
  a: string;
}

export type SubsidyEligibilityOp = 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';

export interface SubsidyEligibilityRule {
  field: string;
  op: SubsidyEligibilityOp;
  value: unknown;
}

export interface SubsidyProgram {
  id: string;
  category: SubsidyCategory;
  npa_reference: string;
  reg_number: string | null;
  name_ru: string;
  name_kz: string;
  name_en: string;
  description_ru: string | null;
  description_kz: string | null;
  recipients_ru: string | null;
  okved_codes: string[];
  source_budget: string;
  submission_platform_url: string | null;
  submission_platform_name: string | null;
  submission_period: string | null;
  processing_days: number | null;
  reimbursement_rate_text: string | null;
  formula_text: string | null;
  obligations_ru: string | null;
  sanctions_ru: string | null;
  documents: SubsidyDocument[];
  steps: SubsidyStep[];
  faq: SubsidyFaq[];
  eligibility_rules: SubsidyEligibilityRule[];
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface SubsidyRate {
  id: string;
  subsidy_id: string;
  subcategory: string | null;
  name_ru: string;
  unit: string | null;
  rate_kzt: number | null;
  rate_cap_pct: number | null;
  condition_ru: string | null;
  filters: Record<string, unknown>;
  order_index: number;
  created_at: string;
}

export interface InvestmentPassport {
  id: string;
  subsidy_id: string;
  passport_number: number;
  name_ru: string;
  name_kz: string;
  description_ru: string | null;
  default_rate_pct: number | null;
  order_index: number;
  created_at: string;
}

export interface InvestmentItem {
  id: string;
  passport_id: string;
  position_code: string | null;
  name_ru: string;
  unit: string;
  reimbursement_rate_pct: number | null;
  max_cost_kzt: number | null;
  min_threshold_ru: string | null;
  note_ru: string | null;
  filters: Record<string, unknown>;
  order_index: number;
  created_at: string;
}

// Match engine inputs — superset of finance ProjectInputs plus subsidy-specific
export interface SubsidyMatchInputs {
  recipient_type: 'shtp' | 'cooperative' | 'individual' | 'processor' | null;
  okved: string | null;
  // Activity flags (multi-select)
  has_livestock_breeding: boolean;
  has_crop: boolean;
  has_dairy: boolean;
  has_meat: boolean;
  has_wool_honey: boolean;
  needs_investment: boolean;
  needs_irrigation: boolean;
  // Details
  livestock_type: string | null; // cattle | sheep | poultry | pig | horse | camel | goat
  livestock_origin: string | null; // domestic | cis | eu
  herd_size: number;
  land_area: number;
  irrigated_area: number;
  irrigation_equipment: string | null; // sprinkler_circular | sprinkler_drum | drip | infrastructure
  irrigation_cost_per_ha: number | null;
  is_cooperative: boolean;
}

export interface MatchedRate {
  rate_id: string;
  rate_name: string;
  qty: number;
  unit: string;
  amount_kzt: number;
}

export interface MatchedSubsidy {
  subsidy: SubsidyProgram;
  matched_rates: MatchedRate[];
  total_amount_kzt: number;
}

export interface SubsidyProjectMatch {
  id: string;
  project_id: string;
  subsidy_id: string;
  matched_rates: MatchedRate[];
  matched_items: Array<{ item_id: string; qty: number; amount_kzt: number }>;
  estimated_amount_kzt: number | null;
  status: 'suggested' | 'confirmed' | 'dismissed';
  created_at: string;
  updated_at: string;
}
