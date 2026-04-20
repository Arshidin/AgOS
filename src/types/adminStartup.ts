import type {
  Startup,
  StartupTeamMember,
  StartupUseOfFunds,
  SubmissionStatus,
  StartupCategory,
  StartupStage,
} from './startup';

export type { SubmissionStatus };

export type AdminStartup = Startup;

export interface AdminStartupDetail extends Startup {
  team_members: StartupTeamMember[];
  use_of_funds: StartupUseOfFunds[];
}

export interface AdminStartupsFilters {
  submission_status: SubmissionStatus | null;
  category: StartupCategory | null;
  stage: StartupStage | null;
  page: number;
}

export interface AdminStartupsResponse {
  data: AdminStartup[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  pending_count: number;
}
