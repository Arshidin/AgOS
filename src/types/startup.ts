export type StartupCategory =
  | 'agritech'
  | 'livestock'
  | 'feed_nutrition'
  | 'genetics'
  | 'cold_chain'
  | 'processing'
  | 'digital_platform'
  | 'sustainability';

export type StartupStage = 'idea' | 'pre_seed' | 'seed' | 'series_a' | 'growth';

export type FundingStatus = 'open' | 'closing_soon' | 'closed';

export type SubmissionStatus = 'pending_review' | 'approved' | 'rejected';

export interface Startup {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description_problem: string | null;
  description_solution: string | null;
  target_market: string | null;
  business_model: string | null;
  category: StartupCategory;
  stage: StartupStage;
  funding_ask: number | null;
  funding_raised: number | null;
  funding_instrument: string | null;
  funding_status: FundingStatus;
  year_founded: number | null;
  team_size: number | null;
  location_region: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  pitch_deck_url: string | null;
  one_pager_url: string | null;
  video_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  social_links: Record<string, string>;
  is_published: boolean;
  submission_status: SubmissionStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface StartupTeamMember {
  id: string;
  startup_id: string;
  name: string;
  role: string | null;
  bio: string | null;
  photo_url: string | null;
  order_index: number;
}

export interface StartupUseOfFunds {
  id: string;
  startup_id: string;
  item: string;
  percentage: number;
  description: string | null;
}

export interface StartupsFilters {
  search: string;
  category: StartupCategory | null;
  stage: StartupStage | null;
  fundingStatus: FundingStatus | null;
  region: string | null;
  sort: string;
  page: number;
}

export interface StartupsResponse {
  data: Startup[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StartupDetail extends Startup {
  team_members: StartupTeamMember[];
  use_of_funds: StartupUseOfFunds[];
}

// ─── Submission form types ───────────────────────────────────

export interface SubmitStartupBasicData {
  title: string;
  website_url: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}

export interface SubmitTeamMember {
  name: string;
  role: string;
}

export interface SubmitUseOfFunds {
  item: string;
  percentage: number;
}

export interface SubmitStartupFormData {
  // Basic (step 1)
  title: string;
  website_url: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  // AI-parsed (step 3)
  tagline: string;
  category: StartupCategory | '';
  stage: StartupStage | '';
  description_problem: string;
  description_solution: string;
  target_market: string;
  business_model: string;
  funding_ask: string;
  funding_instrument: string;
  year_founded: string;
  team_size: string;
  location_region: string;
  team_members: SubmitTeamMember[];
  use_of_funds: SubmitUseOfFunds[];
}

export interface AiParsedData {
  tagline?: string;
  category?: StartupCategory;
  stage?: StartupStage;
  description_problem?: string;
  description_solution?: string;
  target_market?: string;
  business_model?: string;
  funding_ask?: number;
  funding_instrument?: string;
  year_founded?: number;
  team_size?: number;
  location_region?: string;
  team_members?: SubmitTeamMember[];
  use_of_funds?: SubmitUseOfFunds[];
  cover_image_url?: string | null;
}
