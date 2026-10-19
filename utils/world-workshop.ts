/** Public shape only. Private configuration and data stay in world-workshop-server. */
export type WorldWorkshopStageId = 'making' | 'backed-up' | 'restore-verified';

export type WorldWorkshopStage = {
  id: WorldWorkshopStageId;
  label: string;
  demoStatus: 'in-progress' | 'complete';
  actualStatus: 'unknown';
};

export type WorldWorkshopData = {
  isSample: true;
  title: string;
  notice: string;
  latestPreview: { url: '/world'; label: string };
  version: string;
  stages: WorldWorkshopStage[];
  lastVerifiedAt: null;
  driveUrl: string | null;
};

export type WorldWorkshopErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'OWNER_ONLY'
  | 'WORKSHOP_UNAVAILABLE';

export type WorldWorkshopResponse =
  | { data: WorldWorkshopData }
  | { code: WorldWorkshopErrorCode; message: string };
