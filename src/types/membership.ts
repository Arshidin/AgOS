// Phase 1: Membership types (mirrors DB schema)

export type MembershipStatus = 'applicant' | 'observer' | 'active' | 'associate' | 'restricted' | 'expelled';
export type OrgType = 'farmer' | 'mpk';
export type UserRole = 'pending' | 'farmer' | 'mpk' | 'admin';

// Re-export TSP enums used in MpkProfile
import type { AnimalCategory } from '@/types/tsp';

export type KzRegion =
  | 'akmola' | 'aktobe' | 'almaty_obl' | 'almaty_city' | 'astana'
  | 'atyrau' | 'east_kz' | 'zhambyl' | 'west_kz' | 'karaganda'
  | 'kostanay' | 'kyzylorda' | 'mangystau' | 'pavlodar' | 'north_kz'
  | 'shymkent' | 'turkestan' | 'ulytau' | 'zhetysu' | 'abai';

export interface Organization {
  id: string;
  org_type: OrgType;
  name: string;
  bin: string | null;
  region: KzRegion;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  membership_status: MembershipStatus;
  applied_at: string;
  approved_at: string | null;
  activated_at: string | null;
  status_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  organization_id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}

export interface FarmProfile {
  id: string;
  organization_id: string;
  herd_cattle_total: number;
  herd_bulls: number;
  herd_cows: number;
  herd_young: number;
  breed_composition: Record<string, number>;
  quarterly_sales_estimate: number | null;
  notes: string | null;
  updated_at: string;
}

export interface MpkProfile {
  id: string;
  organization_id: string;
  annual_demand_heads: number | null;
  processing_capacity_per_day: number | null;
  preferred_categories: AnimalCategory[];
  preferred_regions: KzRegion[];
  notes: string | null;
  updated_at: string;
}

export const MEMBERSHIP_HIERARCHY: Record<MembershipStatus, number> = {
  expelled: 0,
  restricted: 1,
  applicant: 2,
  observer: 3,
  active: 4,
  associate: 5,
};

export function hasMinStatus(current: MembershipStatus, required: MembershipStatus): boolean {
  return MEMBERSHIP_HIERARCHY[current] >= MEMBERSHIP_HIERARCHY[required];
}

export const KZ_REGIONS: KzRegion[] = [
  'akmola', 'aktobe', 'almaty_obl', 'almaty_city', 'astana',
  'atyrau', 'east_kz', 'zhambyl', 'west_kz', 'karaganda',
  'kostanay', 'kyzylorda', 'mangystau', 'pavlodar', 'north_kz',
  'shymkent', 'turkestan', 'ulytau', 'zhetysu', 'abai',
];
