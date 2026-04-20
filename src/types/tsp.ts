// TSP types (mirrors DB schema — PRD v2.4)
import type { KzRegion } from '@/types/membership';

// ============================================================
// Phase 3 ENUMs
// ============================================================

export type AnimalCategory = 'BV' | 'BM' | 'KR' | 'NT' | 'TL' | 'OT';
export type WeightClass = 'WC_300' | 'WC_350' | 'WC_400' | 'WC_450' | 'WC_500' | 'WC_550';
export type BreedGroup = 'PM' | 'M' | 'MX' | 'MD' | 'D' | 'MG';
export type OtBreedGroup = 'OT_PM' | 'OT_M' | 'OT_MX' | 'OT_OTHER';
export type Grade = 'NS' | 'S' | 'HS';
export type PremiumGroup = 'bulls' | 'heifers' | 'cows';

// ============================================================
// Phase 4 ENUMs (PRD v2.4 FSM)
// ============================================================

export type BatchStatus = 'draft' | 'published' | 'matched' | 'cancelled' | 'expired';
export type RequestStatus = 'draft' | 'active' | 'closed' | 'cancelled' | 'expired';
export type PoolStatus = 'filling' | 'filled' | 'executing' | 'executed';
export type ExecutionResult = 'full' | 'partial' | 'failed';

// ============================================================
// Arrays for iteration
// ============================================================

export const ANIMAL_CATEGORIES: AnimalCategory[] = ['BV', 'BM', 'KR', 'NT', 'TL', 'OT'];
export const WEIGHT_CLASSES: WeightClass[] = ['WC_300', 'WC_350', 'WC_400', 'WC_450', 'WC_500', 'WC_550'];
export const BREED_GROUPS: BreedGroup[] = ['PM', 'M', 'MX', 'MD', 'D', 'MG'];
export const GRADES: Grade[] = ['NS', 'S', 'HS'];

export const BATCH_STATUSES: BatchStatus[] = ['draft', 'published', 'matched', 'cancelled', 'expired'];
export const REQUEST_STATUSES: RequestStatus[] = ['draft', 'active', 'closed', 'cancelled', 'expired'];
export const POOL_STATUSES: PoolStatus[] = ['filling', 'filled', 'executing', 'executed'];

// ============================================================
// Phase 3 Row interfaces
// ============================================================

export interface PriceGridRow {
  id: string;
  category: AnimalCategory;
  weight_class: WeightClass;
  breed_group: BreedGroup;
  grade: Grade;
  reference_price_per_kg: number;
  recommended_premium_min: number;
  recommended_premium_max: number;
  is_active: boolean;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface PriceGridLogEntry {
  id: string;
  price_grid_id: string;
  old_price: number | null;
  new_price: number;
  old_premium_min: number | null;
  old_premium_max: number | null;
  new_premium_min: number | null;
  new_premium_max: number | null;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

// ============================================================
// Phase 4 Row interfaces (PRD v2.4)
// ============================================================

export interface Batch {
  id: string;
  organization_id: string;
  category: AnimalCategory;
  weight_class: WeightClass;
  breed_group: BreedGroup;
  grade: Grade;
  heads: number;
  region: KzRegion;
  target_month: string;
  status: BatchStatus;
  notes: string | null;
  published_at: string | null;
  matched_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PoolRequest {
  id: string;
  organization_id: string;
  total_heads: number;
  region: KzRegion;
  target_month: string;
  accepted_categories: AnimalCategory[];
  accepted_weight_min: WeightClass | null;
  accepted_weight_max: WeightClass | null;
  accepted_breed_min: BreedGroup | null;
  accepted_grades: Grade[];
  premium_bulls: number;
  premium_heifers: number;
  premium_cows: number;
  status: RequestStatus;
  notes: string | null;
  activated_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pool {
  id: string;
  pool_request_id: string;
  status: PoolStatus;
  execution_result: ExecutionResult | null;
  execution_note: string | null;
  created_at: string;
  filled_at: string | null;
  executing_at: string | null;
  executed_at: string | null;
  created_by: string | null;
}

export interface PoolMatch {
  id: string;
  pool_id: string;
  batch_id: string;
  heads: number;
  reference_price_at_match: number;
  premium_at_match: number;
  created_at: string;
  created_by: string | null;
}

// ============================================================
// Phase 3 RPC response types
// ============================================================

export interface AggregatedSupply {
  region: KzRegion;
  target_month: string;
  category: AnimalCategory;
  weight_class: WeightClass;
  breed_group: BreedGroup;
  grade: Grade;
  total_heads: number;
  batch_count: number;
}

export interface AggregatedDemand {
  region: KzRegion;
  target_month: string;
  total_heads: number;
  request_count: number;
}

export interface DemandByCategory {
  region: KzRegion;
  target_month: string;
  category: AnimalCategory;
  max_possible_heads: number;
  request_count: number;
  avg_request_size: number;
}
