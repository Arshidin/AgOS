export type GoalType = 'start_farm' | 'add_livestock' | 'expand_farm' | 'increase_herd' | 'working_capital';

export type UserSegment = 'investor' | 'crop_farmer' | 'livestock_farmer' | 'hybrid';

export type StageStatus = 'available' | 'conditional' | 'locked';

export interface FinanceProgram {
  id: string;
  name_ru: string;
  name_kz: string;
  name_en: string;
  type: string;
  description_ru: string | null;
  description_kz: string | null;
  description_en: string | null;
  role_in_project_ru: string | null;
  role_in_project_kz: string | null;
  when_used_ru: string | null;
  when_used_kz: string | null;
  financing_scope_ru: string | null;
  financing_scope_kz: string | null;
  limits_min: number;
  limits_max: number;
  restrictions: unknown[];
  eligibility_rules: EligibilityRule[];
  order_index: number;
  is_active: boolean;
}

export interface EligibilityRule {
  field: string;
  op: 'eq' | 'gt' | 'lt' | 'gte' | 'lte';
  value: boolean | number | string;
}

export interface ProjectInputs {
  goal_type: GoalType;
  is_agri_producer: boolean;
  land_area: number;
  has_feed_base: boolean;
  has_farm: boolean;
  herd_size: number;
  target_herd_size: number;
  import_livestock: boolean;
  need_infrastructure: boolean;
}

export interface ProgramDependency {
  id: string;
  program_id: string;
  depends_on_program_id: string | null;
  condition: {
    reason_ru?: string;
    reason_kz?: string;
    check_field?: string;
    check_value?: unknown;
  };
}

export interface ComputedStage {
  program: FinanceProgram;
  status: StageStatus;
  reason?: string;
  order: number;
}

export const GOAL_OPTIONS: { value: GoalType; labelKey: string }[] = [
  { value: 'start_farm', labelKey: 'finance.goals.start_farm' },
  { value: 'add_livestock', labelKey: 'finance.goals.add_livestock' },
  { value: 'expand_farm', labelKey: 'finance.goals.expand_farm' },
  { value: 'increase_herd', labelKey: 'finance.goals.increase_herd' },
  { value: 'working_capital', labelKey: 'finance.goals.working_capital' },
];
