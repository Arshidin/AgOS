export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type ApplicationRole = 'farmer' | 'mpk';

export interface Application {
  id: string;
  role: ApplicationRole;
  status: ApplicationStatus;
  full_name: string;
  phone: string;
  region: string | null;
  farm_name: string | null;
  bin_iin: string | null;
  herd_size: string | null;
  primary_breed: string | null;
  company_name: string | null;
  bin: string | null;
  company_type: string | null;
  monthly_volume: string | null;
  ready_to_sell: string | null;
  sell_count: string | null;
  target_breeds: string[] | null;
  target_weight: string | null;
  procurement_frequency: string | null;
  how_heard: string | null;
  consent_given: boolean | null;
  created_at: string;
  updated_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export interface ApplicationsFilters {
  status: ApplicationStatus | null;
  role: ApplicationRole | null;
  region: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  page: number;
}

export interface ApplicationsResponse {
  data: Application[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  pending_all: number;
  pending_farmer: number;
  pending_mpk: number;
}

export interface RpcResult {
  success: boolean;
  error?: string;
  new_record_id?: string;
  role?: string;
}
